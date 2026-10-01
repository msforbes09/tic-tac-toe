import { describe, expect, it } from "vitest"
import measured from "../../docs/promo/audio/durations.json"
import type { Span } from "./alignment"
import { DRAW } from "./draw"
import type { Sentence } from "./script"
import { type Measured, buildTimeline, clipEnd, soundCues } from "./timeline"

// Every take lasting exactly its storyboard target (section 4).
const targets: Measured = {
  narration: {
    seconds: 30,
    sentences: {
      "1": [0.5, 1.5],
      "2": [1.8, 3.6],
      "3": [3.9, 5.3],
      "4a": [11.0, 13.8],
      "4b": [13.8, 15.4],
      "4c": [15.4, 18.2],
      "5": [18.5, 20.4],
      "6": [20.7, 23.8],
      "7": [24.2, 26.6],
      "8": [27.0, 28.7],
    },
    zero: 25.3,
  },
  "bot-01": { seconds: 1.2, speech: [0, 1.2] },
  "bot-02": { seconds: 0.9, speech: [0, 0.9] },
}

const withSentence = (key: Sentence, span: Span): Measured => ({
  ...targets,
  narration: { ...targets.narration, sentences: { ...targets.narration.sentences, [key]: span } },
})

const withBot = (key: "bot-01" | "bot-02", speech: Span): Measured => ({
  ...targets,
  [key]: { seconds: speech[1], speech },
})

const STORYBOARD_SHOTS = {
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

describe("buildTimeline at the storyboard targets", () => {
  const t = buildTimeline(targets)

  it("reproduces the storyboard frame table", () => {
    expect(t.shots).toEqual(STORYBOARD_SHOTS)
  })

  it("starts each narrated shot 4 frames before its sentence", () => {
    for (const key of ["4a", "4b", "4c", "5", "6", "7", "8"] as const) {
      expect(t.narration[key].from).toBe(t.shots[key] + 4)
    }
  })

  it('places the opening sentences and "Now it talks back."', () => {
    expect(t.narration["1"].from).toBe(15)
    expect(t.narration["2"].from).toBe(54)
    expect(t.narration["3"].from).toBe(117)
  })

  it("trims each sentence out of the take", () => {
    expect(t.narration["4a"]).toEqual({ from: 328, trimBefore: 330, trimAfter: 414 })
  })

  it("puts the bot lines on their bubbles and the toast after the second", () => {
    expect(t.bot1).toEqual({ from: 165, trimBefore: 0, trimAfter: 36 })
    expect(t.bot2).toEqual({ from: 240, trimBefore: 0, trimAfter: 27 })
    expect(t.toast).toBe(278)
  })

  it("exits each bubble as its line ends", () => {
    expect(t.bubble1Exit).toBe(201)
    expect(t.bubble2Exit).toBe(270)
  })

  it("lists every spoken stretch for ducking, in order", () => {
    expect(t.speech[0]).toEqual([15, 45])
    expect(t.speech).toContainEqual([165, 201])
    expect(t.speech).toContainEqual([240, 267])
    expect(t.speech).toHaveLength(12)
  })

  it('lifts the second slogan line on "Zero"', () => {
    expect(t.zero).toBe(724 + 33)
  })
})

describe("buildTimeline with the measured takes", () => {
  const t = buildTimeline(measured as Measured)

  it("keeps the storyboard shots, since every sentence fits its target", () => {
    expect(t.shots).toEqual(STORYBOARD_SHOTS)
  })

  it('ends bot-01 by the end of shot 2, at least 6 frames after "Now it talks back."', () => {
    expect(t.bot1.from - clipEnd(t.narration["3"])).toBeGreaterThanOrEqual(6)
    expect(clipEnd(t.bot1)).toBeLessThanOrEqual(204)
  })

  it("ends bot-02 before the toast chime", () => {
    expect(clipEnd(t.bot2)).toBeLessThan(t.toast)
  })

  it("clears the second bubble out of the toast zone before the toast drops", () => {
    expect(t.bubble2Exit + 8).toBeLessThanOrEqual(t.toast)
  })
})

describe("buildTimeline rules", () => {
  it("pushes a sentence that would start inside the previous one", () => {
    const long = buildTimeline(withSentence("4a", [11.0, 14.2]))
    expect(long.narration["4b"].from).toBe(328 + 96)
    expect(long.shots["4b"]).toBe(328 + 96 - 4)
  })

  it("measures a bot line by its speech, not by where the speech ends in the file", () => {
    const t = buildTimeline(withBot("bot-01", [0.2, 1.4]))
    expect(t.bot1).toEqual({ from: 165, trimBefore: 6, trimAfter: 42 })
  })

  it('refuses a bot-01 that cannot fit after "Now it talks back."', () => {
    expect(() => buildTimeline(withSentence("3", [3.9, 5.9]))).toThrow("bot-01")
  })

  it("refuses a sentence 2 that runs into shot 2", () => {
    expect(() => buildTimeline(withSentence("2", [1.8, 4.0]))).toThrow("sentence 2")
  })

  it("refuses a take that would grow shot 3 past 120 frames", () => {
    expect(() => buildTimeline(withSentence("3", [3.9, 11.0]))).toThrow("shot 3")
  })

  it("refuses a take that leaves the logo less than 2 s", () => {
    expect(() => buildTimeline(withSentence("7", [24.2, 28.6]))).toThrow("shot 8")
  })

  it("refuses a narration that runs past frame 900", () => {
    expect(() => buildTimeline(withSentence("8", [27.0, 30.5]))).toThrow("frame 900")
  })

  it("refuses a bot-02 that would leave the toast under 0.6 s of hold", () => {
    expect(() => buildTimeline(withBot("bot-02", [0, 1.75]))).toThrow("toast")
  })

  it("refuses a bot-02 so long that the toast gets no hold", () => {
    expect(() => buildTimeline(withBot("bot-02", [0, 2.5]))).toThrow("toast")
  })
})

describe("beats", () => {
  it("lands the logo's start cue on the frame its X finishes drawing", () => {
    const t = buildTimeline(targets)
    expect(t.beats.logoDone).toBe(t.beats.logo + DRAW.o + 2 * DRAW.arm)
    expect(soundCues(t)).toContainEqual({ at: t.beats.logoDone, cue: "start" })
  })

  it("raises the site's address at frame 846, 12 frames after the wordmark starts", () => {
    const t = buildTimeline(targets)
    expect(t.beats.logoDone).toBe(834)
    expect(t.beats.url).toBe(846)
  })
})

describe("soundCues", () => {
  it("plays the storyboard cue list (section 6) at the targets", () => {
    expect(soundCues(buildTimeline(targets))).toEqual([
      { at: 9, cue: "start" },
      { at: 66, cue: "move-x" },
      { at: 90, cue: "move-o" },
      { at: 207, cue: "move-x" },
      { at: 216, cue: "move-o" },
      { at: 225, cue: "move-x" },
      { at: 226, cue: "win" },
      { at: 278, cue: "achievement" },
      { at: 338, cue: "move-x" },
      { at: 342, cue: "move-o" },
      { at: 346, cue: "move-x" },
      { at: 350, cue: "move-o" },
      { at: 423, cue: "move-x" },
      { at: 439, cue: "move-o" },
      { at: 486, cue: "move-o" },
      { at: 510, cue: "step-587" },
      { at: 534, cue: "move-x" },
      { at: 593, cue: "achievement" },
      { at: 621, cue: "move-x" },
      { at: 654, cue: "move-x" },
      { at: 684, cue: "move-x" },
      { at: 744, cue: "win" },
      { at: 834, cue: "start" },
    ])
  })

  it("starts no game sound while the bot speaks", () => {
    const t = buildTimeline(measured as Measured)
    for (const bot of [t.bot1, t.bot2]) {
      for (const { at } of soundCues(t)) expect(at < bot.from || at >= clipEnd(bot)).toBe(true)
    }
  })
})
