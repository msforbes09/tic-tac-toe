import { describe, expect, it } from "vitest"
import { type Alignment, readTake, spanOf } from "./alignment"

// One character every 0.1 s, each 0.08 s long.
const align = (text: string): Alignment => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i / 10),
  character_end_times_seconds: [...text].map((_, i) => i / 10 + 0.08),
})

describe("spanOf", () => {
  const take = align("Hi. Go now. Go on.")

  it("spans a phrase from its first character start to its last character end", () => {
    expect(spanOf(take, "Go now.")).toEqual([0.4, 1.08])
  })

  it("finds a phrase after a given one, not its first occurrence", () => {
    const [start, end] = spanOf(take, "Go", "Go now.")
    expect(start).toBeCloseTo(1.2)
    expect(end).toBeCloseTo(1.38)
  })

  it("throws when the take does not contain the phrase to search after", () => {
    expect(() => spanOf(take, "Go", "Stop.")).toThrow('"Stop."')
  })

  it("throws when the take does not contain the phrase", () => {
    expect(() => spanOf(take, "Stop.")).toThrow('"Stop."')
  })
})

describe("readTake", () => {
  const good = { audio_base64: "AAAA", alignment: align("Hi.") }
  const withAlignment = (change: Partial<Record<keyof Alignment, unknown>>) => ({
    ...good,
    alignment: { ...good.alignment, ...change },
  })

  it("accepts a response with audio and matching, finite timings", () => {
    expect(readTake(good)).toEqual(good)
  })

  it.each([
    ["no audio", { ...good, audio_base64: 42 }],
    ["no alignment", { audio_base64: "AAAA" }],
    ["short timings", withAlignment({ character_end_times_seconds: [0.1] })],
    [
      "a timing that is not a number",
      withAlignment({ character_start_times_seconds: [0, null, 0.2] }),
    ],
  ])("rejects a response with %s", (_, body) => {
    expect(() => readTake(body)).toThrow("ElevenLabs")
  })
})
