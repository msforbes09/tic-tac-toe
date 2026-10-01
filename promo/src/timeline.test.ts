import { describe, expect, it } from "vitest"
import measured from "../../docs/promo/audio/durations.json"
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

const with3 = (s3: [number, number]): Measured => ({
  ...targets,
  narration: { ...targets.narration, sentences: { ...targets.narration.sentences, "3": s3 } },
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
    const s3End = t.narration["3"].from + t.narration["3"].trimAfter - t.narration["3"].trimBefore
    const bot1End = t.bot1.from + t.bot1.trimAfter
    expect(t.bot1.from - s3End).toBeGreaterThanOrEqual(6)
    expect(bot1End).toBeLessThanOrEqual(204)
  })

  it("ends bot-02 before the toast chime", () => {
    expect(t.bot2.from + t.bot2.trimAfter).toBeLessThan(t.toast)
  })

  it("clears the second bubble out of the toast zone before the toast drops", () => {
    expect(t.bubble2Exit + 8).toBeLessThanOrEqual(t.toast)
  })
})

describe("buildTimeline rules", () => {
  it("pushes a sentence that would start inside the previous one", () => {
    const long = buildTimeline({
      ...targets,
      narration: {
        ...targets.narration,
        sentences: { ...targets.narration.sentences, "4a": [11.0, 14.2] },
      },
    })
    expect(long.narration["4b"].from).toBe(328 + 96)
    expect(long.shots["4b"]).toBe(328 + 96 - 4)
  })

  it('refuses a bot-01 that cannot fit after "Now it talks back."', () => {
    expect(() => buildTimeline(with3([3.9, 5.9]))).toThrow("bot-01")
  })

  it("refuses a take that leaves the logo less than 2 s", () => {
    expect(() =>
      buildTimeline({
        ...targets,
        narration: {
          ...targets.narration,
          sentences: { ...targets.narration.sentences, "7": [24.2, 28.6] },
        },
      }),
    ).toThrow("shot 8")
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
