import { describe, expect, it } from "vitest"
import { CUES, PEAK, SAMPLE_RATE, encodeWav, renderCue } from "./tones"

const peakOf = (samples: Float32Array) => samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0)

const upwardCrossings = (samples: Float32Array) =>
  samples.reduce((n, s, i) => (i > 0 && samples[i - 1] < 0 && s >= 0 ? n + 1 : n), 0)

describe("tones", () => {
  it("peaks at -12 dBFS", () => {
    expect(PEAK).toBeCloseTo(0.2512, 4)
  })

  it.each([
    ["move-x", 0.07],
    ["move-o", 0.07],
    ["step-587", 0.07],
    ["win", 3 * 0.09 + 0.16],
    ["achievement", 0.1 + 0.18],
    ["start", 0.08 + 0.1],
  ] as const)("%s lasts %f s and peaks at -12 dBFS", (name, seconds) => {
    const samples = renderCue(CUES[name])
    expect(samples.length).toBe(Math.round(seconds * SAMPLE_RATE))
    expect(peakOf(samples)).toBeCloseTo(PEAK, 3)
  })

  it.each([
    ["move-x", 660],
    ["move-o", 520],
    ["step-587", 587],
  ] as const)("%s is a %i Hz tone", (name, hz) => {
    expect(upwardCrossings(renderCue(CUES[name]))).toBeCloseTo(hz * 0.07, -1)
  })

  it("uses the notes the app plays", () => {
    expect(CUES.win.map((n) => n.hz)).toEqual([523, 659, 784, 1047])
    expect(CUES.achievement.map((n) => n.hz)).toEqual([784, 1175])
    expect(CUES.start.map((n) => n.hz)).toEqual([523, 784])
  })

  it("starts and ends silent so cues do not click", () => {
    const samples = renderCue(CUES["move-x"])
    expect(Math.abs(samples[0])).toBeLessThan(0.01)
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.01)
  })
})

describe("encodeWav", () => {
  it("writes a mono 16-bit PCM wav", () => {
    const bytes = encodeWav(new Float32Array([0, PEAK, -PEAK]))
    const view = new DataView(bytes.buffer)
    const text = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4))
    expect(text(0)).toBe("RIFF")
    expect(view.getUint32(4, true)).toBe(36 + 6)
    expect(text(8)).toBe("WAVE")
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(SAMPLE_RATE)
    expect(view.getUint16(34, true)).toBe(16)
    expect(text(36)).toBe("data")
    expect(view.getUint32(40, true)).toBe(6)
    expect(view.getInt16(46, true)).toBe(Math.round(PEAK * 32767))
    expect(view.getInt16(48, true)).toBe(-Math.round(PEAK * 32767))
  })
})
