// Relative levels of the mix (owner ruling, 2026-10-01): narrator is the reference, the bot 2 dB under it,
// the music bed 9 dB under it and ducked a further 4 dB inside speech, the tones 1 dB over the bed.
// scripts/master.ts then brings the whole mix to -14 LUFS, true peak at or below -1 dBTP.
import type { Span } from "./alignment"
import { TOTAL_FRAMES } from "./timeline"

// Integrated loudness of each source (LUFS), measured once with
// `npx remotion ffmpeg -i <file> -af loudnorm=print_format=json -f null -` (tones: win.wav).
export const SOURCE_LUFS = {
  narration: -22.67,
  "bot-01": -16.57,
  "bot-02": -17.26,
  music: -13.02,
  tones: -21.55,
}

const BOT_UNDER = 2
const MUSIC_UNDER = 9
const TONES_OVER_MUSIC = 1
const DUCK = 4
const DUCK_RAMP = 6
const FADE_IN_END = 15
const FADE_OUT_START = 855

export const dbToGain = (db: number) => 10 ** (db / 20)

// The gain that puts a source `under` dB below the narrator.
const under = (source: keyof typeof SOURCE_LUFS, db: number) =>
  dbToGain(SOURCE_LUFS.narration - db - SOURCE_LUFS[source])

export const VOLUME = {
  narration: 1,
  "bot-01": under("bot-01", BOT_UNDER),
  "bot-02": under("bot-02", BOT_UNDER),
  tones: under("tones", MUSIC_UNDER - TONES_OVER_MUSIC),
}

const BED = under("music", MUSIC_UNDER)

// 0 outside speech, 1 inside it, ramping linearly over DUCK_RAMP frames either side.
function duckAmount(frame: number, speech: Span[]): number {
  return Math.max(
    0,
    ...speech.map(([from, to]) =>
      Math.min(
        1,
        Math.max(0, Math.min(frame - (from - DUCK_RAMP), to + DUCK_RAMP - frame) / DUCK_RAMP),
      ),
    ),
  )
}

export function musicVolume(frame: number, speech: Span[]): number {
  const fade = Math.min(
    1,
    frame / FADE_IN_END,
    (TOTAL_FRAMES - frame) / (TOTAL_FRAMES - FADE_OUT_START),
  )
  return Math.max(0, fade) * BED * dbToGain(-DUCK * duckAmount(frame, speech))
}
