// The master: EBU R128 two-pass loudnorm to -14 LUFS integrated, true peak -1.5 dBTP (under the owner's
// -1 dBTP ceiling, leaving room for the AAC encode). Remotion's ffmpeg has loudnorm but no ebur128 filter.

export const TARGET = { integrated: -14, truePeak: -1.5, range: 11 }

export type LoudnormReport = Record<string, string>

const base = () => `loudnorm=I=${TARGET.integrated}:TP=${TARGET.truePeak}:LRA=${TARGET.range}`

export const measureFilter = () => `${base()}:print_format=json`

// The JSON block loudnorm prints at the end of ffmpeg's stderr.
export function parseLoudnorm(stderr: string): LoudnormReport {
  const json = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)
  if (!json) throw new Error("ffmpeg printed no loudnorm measurement")
  const report = JSON.parse(json[0]) as LoudnormReport
  for (const key of ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"]) {
    if (!(key in report)) throw new Error(`the loudnorm measurement has no ${key}`)
  }
  return report
}

export const secondPassFilter = (m: LoudnormReport) =>
  `${base()}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:` +
  `measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`
