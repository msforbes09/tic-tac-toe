// Every shot's start frame and every voice clip's placement, from the storyboard's rules (section 4)
// and the measured takes in docs/promo/audio/durations.json. A take that breaks a rule throws.
import type { Span } from "./alignment"
import { NARRATION, type Sentence } from "./script.ts"
import type { CueName } from "./tones"

export const FPS = 30
export const TOTAL_FRAMES = 900

export type Measured = {
  narration: { seconds: number; sentences: Record<Sentence, Span>; zero: number }
  "bot-01": { seconds: number; speech: Span }
  "bot-02": { seconds: number; speech: Span }
}

export type Shot = "1" | "2" | "3" | "4a" | "4b" | "4c" | "5" | "6" | "7" | "8"

// A stretch of a source file (trim frames) placed on the composition at `from`.
export type Clip = { from: number; trimBefore: number; trimAfter: number }

export type Timeline = {
  shots: Record<Shot, number>
  narration: Record<Sentence, Clip>
  bot1: Clip
  bot2: Clip
  bubble1Exit: number
  bubble2Exit: number
  toast: number
  zero: number
  speech: Span[]
}

// The storyboard's frame table. Shots 1-3 are fixed; later shots start 4 frames before their sentence.
const STORYBOARD: Record<Shot, number> = {
  "1": 0,
  "2": 114,
  "3": 204,
  "4a": 324,
  "4b": 411,
  "4c": 462,
  "5": 549,
  "6": 618,
  "7": 720,
  "8": 804,
}
const LEAD = 4
// Where the storyboard puts the sentences that do not open a shot.
const TARGET: Record<Sentence, number> = {
  "1": 15,
  "2": 54,
  "3": 117,
  "4a": STORYBOARD["4a"] + LEAD,
  "4b": STORYBOARD["4b"] + LEAD,
  "4c": STORYBOARD["4c"] + LEAD,
  "5": STORYBOARD["5"] + LEAD,
  "6": STORYBOARD["6"] + LEAD,
  "7": STORYBOARD["7"] + LEAD,
  "8": STORYBOARD["8"] + LEAD,
}
const BOT1_AIR = 6
const BOT1_TARGET = 165
const BOT2_AT = 240 // the win jingle (frame 226, 13 frames) has ended
const BUBBLE2_LINGER = 3
const TOAST_AT = 278
const TOAST_IN = 8
export const TOAST_EXIT = 316
const LAST_SLOGAN_FRAME = 840
const MIN_LOGO_HOLD = 60

const frames = (seconds: number) => Math.round(seconds * FPS * 1000) / 1000
const clip = (from: number, [start, end]: Span): Clip => ({
  from,
  trimBefore: Math.floor(frames(start)),
  trimAfter: Math.ceil(frames(end)),
})
export const clipEnd = (c: Clip) => c.from + c.trimAfter - c.trimBefore

function rule(holds: boolean, message: string) {
  if (!holds) throw new Error(`timeline: ${message}`)
}

export type Player = "X" | "O"

// The game on the board in shots 1-3: which cell, whose mark, and the frame it starts drawing.
export type Move = { cell: number; player: Player; at: number }
export const MOVES: Move[] = [
  { cell: 4, player: "X", at: 66 },
  { cell: 0, player: "O", at: 90 },
  { cell: 2, player: "X", at: 207 },
  { cell: 1, player: "O", at: 216 },
  { cell: 6, player: "X", at: 225 },
]
export const WIN = { cells: [2, 4, 6], at: 226 }
const START_CUE = 9

export const ROOM_CODE = "XOXO"
export const CHIP_COUNT = 41

// Beats inside the later shots, in frames after the shot starts.
export const BEATS = {
  codeTiles: 14,
  codeStagger: 4,
  phoneX: 12,
  phoneO: 28,
  botSteps: [24, 48, 72],
  chips: 4,
  pills: [3, 36, 66],
  strike: 24,
  logoDone: 30,
}

const moveCue = (player: Player): CueName => (player === "X" ? "move-x" : "move-o")

// Every game sound, in order: the cue and the frame it starts.
export function soundCues(t: Timeline): { at: number; cue: CueName }[] {
  const s = t.shots
  return [
    { at: START_CUE, cue: "start" as const },
    ...MOVES.map((m) => ({ at: m.at, cue: moveCue(m.player) })),
    { at: WIN.at, cue: "win" as const },
    { at: t.toast, cue: "achievement" as const },
    ...[...ROOM_CODE].map((c, i) => ({
      at: s["4a"] + BEATS.codeTiles + i * BEATS.codeStagger,
      cue: moveCue(c as Player),
    })),
    { at: s["4b"] + BEATS.phoneX, cue: "move-x" as const },
    { at: s["4b"] + BEATS.phoneO, cue: "move-o" as const },
    ...(["move-o", "step-587", "move-x"] as const).map((cue, i) => ({
      at: s["4c"] + BEATS.botSteps[i],
      cue,
    })),
    { at: s["5"] + BEATS.chips + CHIP_COUNT - 1, cue: "achievement" as const },
    ...BEATS.pills.map((p) => ({ at: s["6"] + p, cue: "move-x" as const })),
    { at: s["7"] + BEATS.strike, cue: "win" as const },
    { at: s["8"] + BEATS.logoDone, cue: "start" as const },
  ].sort((a, b) => a.at - b.at)
}

export function buildTimeline(m: Measured): Timeline {
  const narration = {} as Record<Sentence, Clip>
  let previousEnd = 0
  for (const { key } of NARRATION) {
    narration[key] = clip(Math.max(TARGET[key], previousEnd), m.narration.sentences[key])
    previousEnd = clipEnd(narration[key])
  }
  rule(clipEnd(narration["2"]) <= STORYBOARD["2"], "sentence 2 must end inside shot 1")

  const shots = { ...STORYBOARD }
  for (const key of ["4a", "4b", "4c", "5", "6", "7", "8"] as const)
    shots[key] = narration[key].from - LEAD
  rule(shots["4a"] === STORYBOARD["4a"], "shot 3 may not grow past 120 frames")
  rule(shots["8"] <= LAST_SLOGAN_FRAME, "shot 8 must start by frame 840 (slogan ends by 28.0 s)")
  rule(TOTAL_FRAMES - shots["8"] >= MIN_LOGO_HOLD, "shot 8 must hold the logo at least 2.0 s")
  rule(clipEnd(narration["8"]) <= TOTAL_FRAMES, "the narration must end by frame 900")

  const bot1Length = clip(0, m["bot-01"].speech).trimAfter
  const bot1 = clip(Math.min(BOT1_TARGET, STORYBOARD["3"] - bot1Length), m["bot-01"].speech)
  rule(
    bot1.from >= clipEnd(narration["3"]) + BOT1_AIR,
    'bot-01 must start 6 frames after "Now it talks back." and end by shot 3',
  )

  const bot2 = clip(BOT2_AT, m["bot-02"].speech)
  const toast = Math.max(TOAST_AT, clipEnd(bot2) + 2)
  rule(
    toast + TOAST_IN <= TOAST_EXIT,
    "bot-02 must end before the toast chime, leaving the toast a hold",
  )

  // The second bubble lingers a beat after its line, but always clears the zone before the toast drops in.
  const bubble2Exit = Math.min(clipEnd(bot2) + BUBBLE2_LINGER, toast - TOAST_IN)

  const s7 = m.narration.sentences["7"][0]
  const zero = narration["7"].from + Math.round(frames(m.narration.zero - s7))

  const speech = [...Object.values(narration), bot1, bot2]
    .map((c): Span => [c.from, clipEnd(c)])
    .sort((a, b) => a[0] - b[0])

  return {
    shots,
    narration,
    bot1,
    bot2,
    bubble1Exit: clipEnd(bot1),
    bubble2Exit,
    toast,
    zero,
    speech,
  }
}
