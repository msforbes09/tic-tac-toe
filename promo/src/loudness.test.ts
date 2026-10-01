import { describe, expect, it } from "vitest"
import { TARGET, masterProblems, measureFilter, parseLoudnorm, secondPassFilter } from "./loudness"

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

  it("passes a master within 1 LU of -14 LUFS with true peak at or under -1 dBTP", () => {
    expect(masterProblems({ input_i: "-14.50", input_tp: "-1.28" })).toEqual([])
  })

  it("names what a master misses", () => {
    expect(masterProblems({ input_i: "-15.20", input_tp: "-0.80" })).toEqual([
      "integrated -15.20 LUFS is more than 1 LU from -14",
      "true peak -0.80 dBTP is over -1",
    ])
  })

  it("builds the measuring pass and the correcting pass from the first measurement", () => {
    expect(measureFilter()).toBe("loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json")
    expect(secondPassFilter(parseLoudnorm(STDERR))).toBe(
      "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=-20.31:measured_TP=-1.42:measured_LRA=6.10:" +
        "measured_thresh=-30.52:offset=0.02:linear=true:print_format=json",
    )
  })
})
