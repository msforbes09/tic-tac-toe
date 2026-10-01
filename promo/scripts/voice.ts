// Generates the narrator take and the two bot lines once, through ElevenLabs, and measures them.
// Run with `npm run voice`: Node loads promo/.env into process.env; nothing here reads, prints or
// writes a key or a voice id. Writes docs/promo/audio/{narration,bot-01,bot-02}.mp3 and durations.json.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Alignment, type Span, spanOf } from '../src/alignment.ts'
import { BOT_LINES, NARRATION } from '../src/script.ts'

const REQUIRED = ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_NARRATOR', 'ELEVENLABS_VOICE_BOT'] as const
const missing = REQUIRED.filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`voice: missing ${missing.join(', ')} in promo/.env; nothing generated`)
  process.exit(1)
}

const audioDir = new URL('../../docs/promo/audio/', import.meta.url)

type Take = { alignment: Alignment; seconds: number }

async function speak(file: string, voice: string, text: string): Promise<Take> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    },
  )
  if (!res.ok) throw new Error(`${file}: ElevenLabs answered ${res.status}`)
  if (!res.headers.get('content-type')?.startsWith('application/json')) {
    throw new Error(`${file}: unexpected content type ${res.headers.get('content-type')}`)
  }
  // The response is data: the mp3 is written as opaque bytes and only its timings are read.
  const body = (await res.json()) as { audio_base64: string; alignment: Alignment }
  const path = fileURLToPath(new URL(file, audioDir))
  writeFileSync(path, Buffer.from(body.audio_base64, 'base64'))
  return { alignment: body.alignment, seconds: probeAudioSeconds(path) }
}

// Fails unless ffprobe reads the file as exactly one audio stream.
function probeAudioSeconds(path: string): number {
  const out = execFileSync(
    'npx',
    ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', path],
    { encoding: 'utf8' },
  )
  const probe = JSON.parse(out.slice(out.indexOf('{'))) as {
    streams: { codec_type: string }[]
    format: { duration: string }
  }
  if (probe.streams.length !== 1 || probe.streams[0].codec_type !== 'audio') {
    throw new Error(`${path} is not a single audio stream`)
  }
  return round(Number(probe.format.duration))
}

const round = (n: number) => Math.round(n * 1000) / 1000
const rounded = ([start, end]: Span): Span => [round(start), round(end)]

const narration = await speak(
  'narration.mp3',
  process.env.ELEVENLABS_VOICE_NARRATOR!,
  NARRATION.map((s) => s.text).join(' '),
)
const bot01 = await speak('bot-01.mp3', process.env.ELEVENLABS_VOICE_BOT!, BOT_LINES['bot-01'])
const bot02 = await speak('bot-02.mp3', process.env.ELEVENLABS_VOICE_BOT!, BOT_LINES['bot-02'])

const durations = {
  narration: {
    seconds: narration.seconds,
    sentences: Object.fromEntries(
      NARRATION.map(({ key, text }, i) => {
        const previous = i > 0 ? NARRATION[i - 1].text : undefined
        return [key, rounded(spanOf(narration.alignment, text, previous))]
      }),
    ),
    zero: rounded(spanOf(narration.alignment, 'Zero'))[0],
  },
  'bot-01': { seconds: bot01.seconds, speech: rounded(spanOf(bot01.alignment, BOT_LINES['bot-01'])) },
  'bot-02': { seconds: bot02.seconds, speech: rounded(spanOf(bot02.alignment, BOT_LINES['bot-02'])) },
}
writeFileSync(new URL('durations.json', audioDir), JSON.stringify(durations, null, 2) + '\n')
console.log('voice: wrote narration.mp3, bot-01.mp3, bot-02.mp3, durations.json')
