import { describe, expect, it } from "vitest"
import measured from "../../docs/promo/audio/durations.json"
import type { Span } from "./alignment"
import type { Sentence } from "./script"
import {
  type Measured,
  MOVES,
  TOTAL_FRAMES,
  WIN,
  buildTimeline,
  clipEnd,
  soundCues,
} from "./timeline"

// Expected values are storyboard-v2's literal frames (sections 3, 4 and 6), typed in, not recomputed.
const takes = measured as Measured

const withSentence = (key: Sentence, span: Span): Measured => ({
  ...takes,
  narration: { ...takes.narration, sentences: { ...takes.narration.sentences, [key]: span } },
})

const withBot = (key: "bot-01" | "bot-02", speech: Span): Measured => ({
  ...takes,
  [key]: { seconds: speech[1], speech },
})

const STORYBOARD_SHOTS = {
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

describe("buildTimeline with the measured takes", () => {
  const t = buildTimeline(takes)

  it("runs 1320 frames, 44.00 s", () => {
    expect(TOTAL_FRAMES).toBe(1320)
  })

  it("reproduces the storyboard frame table (section 3)", () => {
    expect(t.shots).toEqual(STORYBOARD_SHOTS)
  })

  it("places every sentence on its section 4 frame", () => {
    const from = Object.fromEntries(Object.entries(t.narration).map(([k, c]) => [k, c.from]))
    expect(from).toEqual({
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
    })
  })

  it("trims each sentence out of the take", () => {
    expect(t.narration["4a"]).toEqual({ from: 625, trimBefore: 107, trimAfter: 166 })
  })

  it("ends each sentence where section 4 has it, give or take the rounding frame", () => {
    const ends: Record<Sentence, number> = {
      "1": 64,
      "2": 155,
      "3": 264,
      "4a": 683,
      "4b": 750,
      "4c": 858,
      "5": 948,
      "6": 1072,
      "7": 1156,
      "8": 1277,
    }
    for (const [key, end] of Object.entries(ends))
      expect(Math.abs(clipEnd(t.narration[key as Sentence]) - end), key).toBeLessThanOrEqual(1)
  })

  it("puts the bot lines on their bubbles: 273-322 and 480-526", () => {
    expect(t.bot1).toEqual({ from: 273, trimBefore: 0, trimAfter: 49 })
    expect(t.bot2).toEqual({ from: 480, trimBefore: 0, trimAfter: 46 })
  })

  it("exits the first bubble at 328 and the second at 534", () => {
    expect(t.bubble1Exit).toBe(328)
    expect(t.bubble2Exit).toBe(534)
  })

  it("drops the toast at 547", () => {
    expect(t.toast).toBe(547)
  })

  it("lists every spoken stretch for ducking, in order", () => {
    expect(t.speech[0]).toEqual([36, 64])
    expect(t.speech).toContainEqual([273, 322])
    expect(t.speech).toContainEqual([480, 526])
    expect(t.speech).toHaveLength(12)
  })

  it('lifts the second slogan line on "Zero", frame 1127', () => {
    expect(t.zero).toBe(1127)
  })

  it("keeps the narrator silent from 264 to 625", () => {
    for (const [from, to] of t.speech.filter(([from]) => from > 232 && from < 625))
      expect([from, to]).toEqual(from === 273 ? [273, 322] : [480, 526])
  })
})

describe("the game in shots 1-3", () => {
  it("plays the moves at 162, 212, 348, 400, 432", () => {
    expect(MOVES).toEqual([
      { cell: 4, player: "X", at: 162 },
      { cell: 0, player: "O", at: 212 },
      { cell: 2, player: "X", at: 348 },
      { cell: 1, player: "O", at: 400 },
      { cell: 6, player: "X", at: 432 },
    ])
  })

  it("never starts a move less than 1.0 s after the previous one", () => {
    for (let i = 1; i < MOVES.length; i++)
      expect(MOVES[i].at - MOVES[i - 1].at).toBeGreaterThanOrEqual(30)
  })

  it("wins on the diagonal at 448, when the last X stroke finishes", () => {
    expect(WIN).toEqual({ cells: [2, 4, 6], at: 448 })
  })

  it('starts "Lucky square." at least 0.5 s after the win jingle (448, 13 frames) ends', () => {
    expect(buildTimeline(takes).bot2.from - (448 + 13)).toBeGreaterThanOrEqual(15)
  })

  it("lets the bot think before each O: badge in at 178 and 366, out as each O draws", () => {
    expect(buildTimeline(takes).beats.thinking).toEqual([
      { at: 178, exit: 212 },
      { at: 366, exit: 400 },
    ])
  })
})

describe("buildTimeline rules", () => {
  it("measures a bot line by its speech, not by where the speech ends in the file", () => {
    const t = buildTimeline(withBot("bot-01", [0.2, 1.6]))
    expect(t.bot1).toEqual({ from: 273, trimBefore: 6, trimAfter: 48 })
  })

  it('refuses a "Now it talks back." that leaves bot-01 under 6 frames of air', () => {
    expect(() => buildTimeline(withSentence("3", [2.438, 3.75]))).toThrow("bot-01")
  })

  it("refuses a bot-01 whose bubble cannot clear shot 2", () => {
    expect(() => buildTimeline(withBot("bot-01", [0, 2.0]))).toThrow("bot-01")
  })

  it("refuses a sentence that runs into the next shot", () => {
    expect(() => buildTimeline(withSentence("2", [1.091, 5.0]))).toThrow("sentence 2")
    expect(() => buildTimeline(withSentence("6", [11.378, 15.4]))).toThrow("sentence 6")
  })

  it("refuses a last sentence that takes more than 6 frames from shot 8 (ends after 1283)", () => {
    expect(() => buildTimeline(withSentence("8", [16.091, 17.85]))).toThrow("sentence 8")
  })

  it("refuses a bot-02 that would leave the toast under 2.0 s of hold", () => {
    expect(() => buildTimeline(withBot("bot-02", [0, 2.5]))).toThrow("toast")
  })
})

describe("beats", () => {
  const b = buildTimeline(takes).beats

  it("raises the sub-line at 117 with its voice and drops it at 168", () => {
    expect(b.subline).toEqual({ at: 117, exit: 168 })
  })

  it("times the splash: title 30, slogan 34, splash-out 97", () => {
    expect(b.splash).toEqual({ logo: 0, title: 30, slogan: 34, exit: 97 })
  })

  it("draws the Kaya mark stroke by stroke (amendment 1): stem 1196, arm 1204, leg 1212, done 1224", () => {
    expect(b.mark).toEqual([1196, 1204, 1212])
    expect(b.markDone).toBe(1224)
  })

  it("raises the wordmark at 1230 and the URL at 1242", () => {
    expect(b.wordmark).toBe(1230)
    expect(b.url).toBe(1242)
  })

  it("places the later shots' beats on the storyboard frames", () => {
    expect(b.codeTiles).toEqual([633, 637, 641, 645])
    expect([b.phoneX, b.phoneO]).toEqual([735, 751])
    expect(b.botSteps).toEqual([813, 837, 861])
    expect([b.chips, b.platinum]).toEqual([900, 940])
    expect(b.pills).toEqual([988, 1020, 1050])
    expect(b.slogan).toBe(1098)
    expect(b.rowWin).toBe(1126)
  })
})

describe("soundCues", () => {
  it("plays the storyboard cue list (section 6, shot 8 as amended)", () => {
    expect(soundCues(buildTimeline(takes))).toEqual([
      { at: 0, cue: "move-o" },
      { at: 16, cue: "move-x" },
      { at: 30, cue: "start" },
      { at: 162, cue: "move-x" },
      { at: 212, cue: "move-o" },
      { at: 348, cue: "move-x" },
      { at: 400, cue: "move-o" },
      { at: 432, cue: "move-x" },
      { at: 448, cue: "win" },
      { at: 547, cue: "achievement" },
      { at: 633, cue: "move-x" },
      { at: 637, cue: "move-o" },
      { at: 641, cue: "move-x" },
      { at: 645, cue: "move-o" },
      { at: 735, cue: "move-x" },
      { at: 751, cue: "move-o" },
      { at: 813, cue: "move-o" },
      { at: 837, cue: "step-587" },
      { at: 861, cue: "move-x" },
      { at: 940, cue: "achievement" },
      { at: 988, cue: "move-x" },
      { at: 1020, cue: "move-x" },
      { at: 1050, cue: "move-x" },
      { at: 1126, cue: "win" },
      { at: 1196, cue: "move-x" },
      { at: 1212, cue: "move-o" },
      { at: 1224, cue: "start" },
    ])
  })

  it("starts no game sound while the bot speaks", () => {
    const t = buildTimeline(takes)
    for (const bot of [t.bot1, t.bot2]) {
      for (const { at } of soundCues(t)) expect(at < bot.from || at >= clipEnd(bot)).toBe(true)
    }
  })
})
