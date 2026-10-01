import { describe, expect, it } from "vitest"
import {
  TARGET,
  aimFor,
  masterProblems,
  measureFilter,
  parseLoudnorm,
  secondPassFilter,
} from "./loudness"

// The tail of ffmpeg's stderr after a loudnorm pass with print_format=json.
const STDERR = `size=N/A time=00:00:30.00 bitrate=N/A speed= 120x
[Parsed_loudnorm_0 @ 0x600]
{
	"input_i" : "-20.31",
	"input_tp" : "-1.42",
	"input_lra" : "6.10",
	"input_thresh" : "-30.52",
	"output_i" : "-14.02",
	"output_tp" : "-1.50",
	"output_lra" : "5.20",
	"output_thresh" : "-24.20",
	"normalization_type" : "dynamic",
	"target_offset" : "0.02"
}
`

describe("loudness", () => {
  it("targets -14 LUFS with true peak under -1 dBTP (owner ruling)", () => {
    expect(TARGET.integrated).toBe(-14)
    expect(TARGET.truePeak).toBeLessThan(-1)
  })

  it("reads the measurement ffmpeg prints", () => {
    expect(parseLoudnorm(STDERR)).toEqual({
      input_i: "-20.31",
      input_tp: "-1.42",
      input_lra: "6.10",
      input_thresh: "-30.52",
      output_i: "-14.02",
      output_tp: "-1.50",
      output_lra: "5.20",
      output_thresh: "-24.20",
      normalization_type: "dynamic",
      target_offset: "0.02",
    })
  })

  it("fails loudly when ffmpeg printed no measurement", () => {
    expect(() => parseLoudnorm("no json here")).toThrow("loudnorm")
  })

  it("fails loudly when the measurement lacks a value the second pass needs", () => {
    expect(() => parseLoudnorm(STDERR.replace(/\s*"input_lra" : "6.10",/, ""))).toThrow("input_lra")
  })

  it("passes a master within 0.5 LU of -14 LUFS with true peak at or under -1 dBTP (handoff 004)", () => {
    expect(masterProblems({ input_i: "-14.45", input_tp: "-1.28" })).toEqual([])
    expect(masterProblems({ input_i: "-14.68", input_tp: "-1.32" })).toEqual([
      "integrated -14.68 LUFS is more than 0.5 LU from -14",
    ])
  })

  it("names what a master misses", () => {
    expect(masterProblems({ input_i: "-15.20", input_tp: "-0.80" })).toEqual([
      "integrated -15.20 LUFS is more than 0.5 LU from -14",
      "true peak -0.80 dBTP is over -1",
    ])
  })

  it("aims a corrected second pass past -14 by what the first master missed", () => {
    expect(aimFor({ input_i: "-14.68" })).toBeCloseTo(-13.32, 5)
    expect(aimFor({ input_i: "-13.80" })).toBeCloseTo(-14.2, 5)
  })

  it("builds a corrected second pass at the aimed level", () => {
    expect(secondPassFilter(parseLoudnorm(STDERR), -13.32)).toBe(
      "loudnorm=I=-13.32:TP=-1.5:LRA=11:measured_I=-20.31:measured_TP=-1.42:measured_LRA=6.10:" +
        "measured_thresh=-30.52:offset=0.02:linear=true:print_format=json",
    )
  })

  it("builds the measuring pass and the correcting pass from the first measurement", () => {
    expect(measureFilter()).toBe("loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json")
    expect(secondPassFilter(parseLoudnorm(STDERR))).toBe(
      "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=-20.31:measured_TP=-1.42:measured_LRA=6.10:" +
        "measured_thresh=-30.52:offset=0.02:linear=true:print_format=json",
    )
  })
})
