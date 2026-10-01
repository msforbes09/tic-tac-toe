// Generates the narrator take and the two bot lines once, through ElevenLabs, and measures them.
// Run with `npm run voice`: Node loads promo/.env into process.env; nothing here reads, prints or
// writes a key or a voice id. Writes docs/promo/audio/{narration,bot-01,bot-02}.mp3 and durations.json
// together, and only once all three takes have arrived and checked out, so a failed run changes nothing.
import { execFileSync } from "node:child_process"
import { mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { type Alignment, type Span, readTake, spanOf } from "../src/alignment.ts"
import { BOT_LINES, NARRATION } from "../src/script.ts"

const REQUIRED = [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_NARRATOR",
  "ELEVENLABS_VOICE_BOT",
] as const
const missing = REQUIRED.filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`voice: missing ${missing.join(", ")} in promo/.env; nothing generated`)
  process.exit(1)
}

const audioDir = fileURLToPath(new URL("../../docs/promo/audio/", import.meta.url))
const remotion = fileURLToPath(new URL("../node_modules/.bin/remotion", import.meta.url))
// Staged beside the committed audio (same volume, so the final rename is atomic), removed at the end.
const staging = mkdtempSync(join(audioDir, ".voice-"))

type Measured = { file: string; alignment: Alignment; seconds: number }

// Asks for one take and stages it; the response is data, written as opaque bytes, its timings read only.
async function speak(file: string, voice: string, text: string): Promise<Measured> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    },
  )
  if (!res.ok) throw new Error(`${file}: ElevenLabs answered ${res.status}`)
  if (!res.headers.get("content-type")?.startsWith("application/json")) {
    throw new Error(`${file}: unexpected content type ${res.headers.get("content-type")}`)
  }
  const take = readTake(await res.json())
  const staged = join(staging, file)
  writeFileSync(staged, Buffer.from(take.audio_base64, "base64"))
  return { file, alignment: take.alignment, seconds: probeAudioSeconds(staged) }
}

// Fails unless ffprobe reads the file as exactly one audio stream.
function probeAudioSeconds(path: string): number {
  const out = execFileSync(
    remotion,
    [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type:format=duration",
      "-of",
      "json",
      path,
    ],
    { encoding: "utf8" },
  )
  const probe = JSON.parse(out.slice(out.indexOf("{"))) as {
    streams: { codec_type: string }[]
    format: { duration: string }
  }
  if (probe.streams.length !== 1 || probe.streams[0].codec_type !== "audio") {
    throw new Error(`${path} is not a single audio stream`)
  }
  return round(Number(probe.format.duration))
}

const round = (n: number) => Math.round(n * 1000) / 1000
const rounded = ([start, end]: Span): Span => [round(start), round(end)]

try {
  const narration = await speak(
    "narration.mp3",
    process.env.ELEVENLABS_VOICE_NARRATOR!,
    NARRATION.map((s) => s.text).join(" "),
  )
  const bot01 = await speak("bot-01.mp3", process.env.ELEVENLABS_VOICE_BOT!, BOT_LINES["bot-01"])
  const bot02 = await speak("bot-02.mp3", process.env.ELEVENLABS_VOICE_BOT!, BOT_LINES["bot-02"])

  const durations = {
    narration: {
      seconds: narration.seconds,
      sentences: Object.fromEntries(
        NARRATION.map(({ key, text }, i) => {
          const previous = i > 0 ? NARRATION[i - 1].text : undefined
          return [key, rounded(spanOf(narration.alignment, text, previous))]
        }),
      ),
      zero: rounded(spanOf(narration.alignment, "Zero"))[0],
    },
    "bot-01": {
      seconds: bot01.seconds,
      speech: rounded(spanOf(bot01.alignment, BOT_LINES["bot-01"])),
    },
    "bot-02": {
      seconds: bot02.seconds,
      speech: rounded(spanOf(bot02.alignment, BOT_LINES["bot-02"])),
    },
  }

  // Everything checked out: move the takes into place and write their timings with them.
  for (const { file } of [narration, bot01, bot02]) {
    renameSync(join(staging, file), join(audioDir, file))
  }
  writeFileSync(join(audioDir, "durations.json"), JSON.stringify(durations, null, 2) + "\n")
  console.log("voice: wrote narration.mp3, bot-01.mp3, bot-02.mp3, durations.json")
} finally {
  rmSync(staging, { recursive: true, force: true })
}
