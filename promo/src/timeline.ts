// Every shot's start frame and every voice clip's placement, from storyboard-v2 (sections 3 and 4) and the
// measured takes in docs/promo/audio/durations.json. A take that breaks a rule throws.
import type { Span } from "./alignment"
// Modules imported for values carry ".ts": Node runs scripts/*.ts against this file without a bundler.
import { TIERS } from "./brand.ts"
import { DRAW, KAYA_DRAW, LOGO_DRAW } from "./draw.ts"
import { NARRATION, type Sentence } from "./script.ts"
import type { CueName } from "./tones"

export const FPS = 30
export const TOTAL_FRAMES = 1320

export type Measured = {
  narration: { seconds: number; sentences: Record<Sentence, Span>; zero: number }
  "bot-01": { seconds: number; speech: Span }
  "bot-02": { seconds: number; speech: Span }
}

export type Shot = "0" | "1" | "2" | "3" | "4a" | "4b" | "4c" | "5" | "6" | "7" | "8"

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
  beats: Beats
}

// The storyboard's frame table (section 3).
const SHOTS: Record<Shot, number> = {
  "0": 0,
  "1": 108,
  "2": 225,
  "3": 336,
  "4a": 621,
  "4b": 711,
  "4c": 783,
  "5": 888,
  "6": 984,
  "7": 1098,
  "8": 1194,
}
// Where each sentence starts (section 4).
const TARGET: Record<Sentence, number> = {
  "1": 36,
  "2": 117,
  "3": 232,
  "4a": 625,
  "4b": 717,
  "4c": 787,
  "5": 892,
  "6": 988,
  "7": 1102,
  "8": 1232,
}
// The shot each sentence must end before. "Now it talks back." is bounded by bot-01, the last by the film.
const ENDS_BEFORE: Partial<Record<Sentence, Shot>> = {
  "1": "1",
  "2": "2",
  "4a": "4b",
  "4b": "4c",
  "4c": "5",
  "5": "6",
  "6": "7",
  "7": "8",
}
// "From Kaya Randomized." ends by 1277; shot 8 may give it 6 frames more, never more (section 3).
const LAST_WORD = 1277 + 6
const BOT1_AIR = 6
const BOT1_AT = 273
const BUBBLE1_LINGER = 6
const BOT2_AT = 480 // 19 frames after the win jingle (frame 448, 13 frames) has ended
const BUBBLE2_LINGER = 8
const TOAST_AT = 547
const TOAST_IN = 8
const MIN_TOAST_HOLD = 60 // 2.0 s, storyboard check 8
export const TOAST_EXIT = SHOTS["4a"] // the toast leaves as shot 4 comes in

// Seconds to frames, rounded to 1/1000 frame first so float noise (1.2 * 30 = 36.000000000000004)
// never tips a floor or ceil over a whole frame.
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
  { cell: 4, player: "X", at: 162 },
  { cell: 0, player: "O", at: 212 },
  { cell: 2, player: "X", at: 348 },
  { cell: 1, player: "O", at: 400 },
  { cell: 6, player: "X", at: 432 },
]
export const WIN = { cells: [2, 4, 6], at: 448 }
// The bot "thinks" before each O: its badge pops in this many frames before the O, breathes, and leaves
// as the O starts. The sub-line leaves this many frames after the first X starts, while it draws.
const THINK = 34
const SUBLINE_LEAVES = 6

export const ROOM_CODE = "XOXO"
export const CHIP_COUNT = TIERS.reduce((sum, t) => sum + t.count, 0)
// Shot 7: the three slogan Xs draw this many frames apart.
export const SLOGAN_STAGGER = 6

// The frames things happen on. The shots draw on them and soundCues sounds on them.
export type Beats = {
  splash: { logo: number; title: number; slogan: number; exit: number } // 0: the app's splash, held
  subline: { at: number; exit: number } // 1: "You learned it on a napkin.", with its voice
  thinking: { at: number; exit: number }[] // 1, 3: the O badge breathes above the board before each O
  codeTiles: number[] // 4a: each XOXO tile pops (4-frame stagger)
  phoneX: number // 4b: the marks on the phone
  phoneO: number
  botSteps: number[] // 4c: the O badge lands on Easy, Medium, Hard (0.8 s apart)
  chips: number // 5: the first chip; the rest follow one frame apart, platinum last
  platinum: number
  pills: number[] // 6: one per claim, on its words
  slogan: number // 7: the first X starts drawing
  rowWin: number // 7: the third X is complete and the three light up as a win
  mark: number[] // 8: the Kaya mark's strokes start drawing: stem, arm, leg (amendment 1)
  markDone: number // 8: the leg is complete
  wordmark: number // 8: "Kaya Randomized" rises
  url: number // 8: the site's address rises (owner ruling, 2026-10-01)
}

// The splash's own timings (Splash.tsx): title at 1000 ms, slogan at 1140 ms; held, then splash-out.
const SPLASH = { title: 30, slogan: 34, exit: 97 }
// Pills 2 and 3 land on their words, measured in handoff 002 as 32 and 62 frames into the sentence ("works",
// "and it's free"): 1020 and 1050, against the storyboard's even-pacing targets 1019 and 1048.
const PILL_WORDS = [0, 32, 62]

function beatsFor(s: Record<Shot, number>, narration: Record<Sentence, Clip>): Beats {
  const chips = s["5"] + 12
  const step = KAYA_DRAW.stroke - KAYA_DRAW.overlap
  const mark = [0, 1, 2].map((i) => s["8"] + KAYA_DRAW.at + i * step)
  const markDone = mark[2] + KAYA_DRAW.stroke
  const wordmark = markDone + 6
  return {
    splash: { logo: s["0"], ...SPLASH },
    subline: { at: narration["2"].from, exit: MOVES[0].at + SUBLINE_LEAVES },
    thinking: MOVES.filter((m) => m.player === "O").map((m) => ({ at: m.at - THINK, exit: m.at })),
    codeTiles: [...ROOM_CODE].map((_, i) => s["4a"] + 12 + 4 * i),
    phoneX: s["4b"] + 24,
    phoneO: s["4b"] + 40,
    botSteps: [30, 54, 78].map((offset) => s["4c"] + offset),
    chips,
    platinum: chips + CHIP_COUNT - 1,
    pills: PILL_WORDS.map((offset) => narration["6"].from + offset),
    slogan: s["7"],
    rowWin: s["7"] + 2 * SLOGAN_STAGGER + 2 * DRAW.arm,
    mark,
    markDone,
    wordmark,
    url: wordmark + 12,
  }
}

const moveCue = (player: Player): CueName => (player === "X" ? "move-x" : "move-o")

// The app's `splash` cue (browserFeedback.ts) from the existing tones: the O tone as the O starts, the X
// tone as the X starts, the start notes as the title rises (1.00 s).
const splashCue = (at: number) => [
  { at, cue: "move-o" as const },
  { at: at + LOGO_DRAW.x, cue: "move-x" as const },
  { at: at + SPLASH.title, cue: "start" as const },
]

// The same three tones for the Kaya mark (amendment 1): X tone on the blue stem, O tone on the coral leg,
// the start notes as it completes.
const markCue = (b: Beats) => [
  { at: b.mark[0], cue: "move-x" as const },
  { at: b.mark[2], cue: "move-o" as const },
  { at: b.markDone, cue: "start" as const },
]

// Every game sound, in order: the cue and the frame it starts.
export function soundCues(t: Timeline): { at: number; cue: CueName }[] {
  const b = t.beats
  return [
    ...splashCue(b.splash.logo),
    ...MOVES.map((m) => ({ at: m.at, cue: moveCue(m.player) })),
    { at: WIN.at, cue: "win" as const },
    { at: t.toast, cue: "achievement" as const },
    ...b.codeTiles.map((at, i) => ({ at, cue: moveCue(ROOM_CODE[i] as Player) })),
    { at: b.phoneX, cue: "move-x" as const },
    { at: b.phoneO, cue: "move-o" as const },
    ...(["move-o", "step-587", "move-x"] as const).map((cue, i) => ({ at: b.botSteps[i], cue })),
    { at: b.platinum, cue: "achievement" as const },
    ...b.pills.map((at) => ({ at, cue: "move-x" as const })),
    { at: b.rowWin, cue: "win" as const },
    ...markCue(b),
  ].sort((a, b) => a.at - b.at)
}

function placeNarration(m: Measured): Record<Sentence, Clip> {
  const narration = {} as Record<Sentence, Clip>
  for (const { key } of NARRATION) {
    narration[key] = clip(TARGET[key], m.narration.sentences[key])
    const next = ENDS_BEFORE[key]
    if (next)
      rule(clipEnd(narration[key]) <= SHOTS[next], `sentence ${key} must end before shot ${next}`)
  }
  rule(clipEnd(narration["8"]) <= LAST_WORD, "sentence 8 may run at most 6 frames past 1277")
  return narration
}

export function buildTimeline(m: Measured): Timeline {
  const narration = placeNarration(m)

  const bot1 = clip(BOT1_AT, m["bot-01"].speech)
  rule(
    bot1.from >= clipEnd(narration["3"]) + BOT1_AIR && clipEnd(bot1) + BUBBLE1_LINGER <= SHOTS["3"],
    'bot-01 must start 6 frames after "Now it talks back." and its bubble clear shot 2',
  )

  const bot2 = clip(BOT2_AT, m["bot-02"].speech)
  const toast = Math.max(TOAST_AT, clipEnd(bot2) + 2)
  rule(
    toast + TOAST_IN + MIN_TOAST_HOLD <= TOAST_EXIT,
    "bot-02 must end before the toast chime, leaving the toast at least 2.0 s of hold",
  )

  // The second bubble lingers a beat after its line, but always clears the zone before the toast drops in.
  const bubble2Exit = Math.min(clipEnd(bot2) + BUBBLE2_LINGER, toast - TOAST_IN)

  const s7 = m.narration.sentences["7"][0]
  const zero = narration["7"].from + Math.round(frames(m.narration.zero - s7))

  const speech = [...Object.values(narration), bot1, bot2]
    .map((c): Span => [c.from, clipEnd(c)])
    .sort((a, b) => a[0] - b[0])

  return {
    shots: { ...SHOTS },
    narration,
    bot1,
    bot2,
    bubble1Exit: clipEnd(bot1) + BUBBLE1_LINGER,
    bubble2Exit,
    toast,
    zero,
    speech,
    beats: beatsFor(SHOTS, narration),
  }
}
