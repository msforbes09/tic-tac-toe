import { describe, expect, it } from "vitest"
import { SOURCE_LUFS, VOLUME, dbToGain, musicVolume } from "./mix"

const db = (gain: number) => 20 * Math.log10(gain)
// Loudness a source lands at in the mix, relative to the narrator.
const underNarrator = (source: keyof typeof SOURCE_LUFS, volume: number) =>
  SOURCE_LUFS.narration + db(VOLUME.narration) - (SOURCE_LUFS[source] + db(volume))

describe("mix levels (owner ruling: music 9 dB under the narrator, bot 2 dB under)", () => {
  it("converts decibels to gain", () => {
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3)
    expect(dbToGain(0)).toBe(1)
  })

  it("renders the narrator 6 dB down, headroom the master gives back", () => {
    expect(db(VOLUME.narration)).toBeCloseTo(-6, 5)
  })

  it("sets both bot lines 2 dB under the narrator", () => {
    expect(underNarrator("bot-01", VOLUME["bot-01"])).toBeCloseTo(2, 5)
    expect(underNarrator("bot-02", VOLUME["bot-02"])).toBeCloseTo(2, 5)
  })

  it("sets the music bed 9 dB under the narrator", () => {
    expect(underNarrator("music", musicVolume(300, []))).toBeCloseTo(9, 5)
  })

  it("sets the tones 1 dB over the music bed", () => {
    expect(underNarrator("tones", VOLUME.tones)).toBeCloseTo(8, 5)
  })

  it("never asks Remotion for more than unity gain", () => {
    for (const v of [...Object.values(VOLUME), musicVolume(300, [])])
      expect(v).toBeLessThanOrEqual(1)
  })
})

describe("musicVolume", () => {
  const bed = musicVolume(300, [])

  it("ducks a further 4 dB inside speech", () => {
    expect(db(musicVolume(300, [[290, 320]])) - db(bed)).toBeCloseTo(-4, 5)
  })

  it("ramps the duck in over the 6 frames before speech and out over the 6 after", () => {
    expect(musicVolume(284, [[290, 320]])).toBeCloseTo(bed, 5)
    expect(db(musicVolume(287, [[290, 320]])) - db(bed)).toBeCloseTo(-2, 5)
    expect(db(musicVolume(323, [[290, 320]])) - db(bed)).toBeCloseTo(-2, 5)
    expect(musicVolume(326, [[290, 320]])).toBeCloseTo(bed, 5)
  })

  it("fades in over the first 0.5 s", () => {
    expect(musicVolume(0, [])).toBe(0)
    expect(musicVolume(15, [])).toBeCloseTo(bed, 5)
  })

  it("fades out from 42.5 s to 44.0 s", () => {
    expect(musicVolume(1275, [])).toBeCloseTo(bed, 5)
    expect(musicVolume(1320, [])).toBe(0)
  })
})
