// The master: EBU R128 two-pass loudnorm to -14 LUFS integrated, true peak -1.5 dBTP (under the owner's
// -1 dBTP ceiling, leaving room for the AAC encode). Remotion's ffmpeg has loudnorm but no ebur128 filter.

export const TARGET = { integrated: -14, truePeak: -1.5, range: 11 }

export type LoudnormReport = Record<string, string>

const base = (integrated = TARGET.integrated) =>
  `loudnorm=I=${integrated}:TP=${TARGET.truePeak}:LRA=${TARGET.range}`

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

// The limits for the final file: within 0.5 LU of -14 LUFS (handoff 004), true peak at or under -1 dBTP.
const CEILING = -1
const TOLERANCE = 0.5

export function masterProblems(m: LoudnormReport): string[] {
  const problems = []
  if (Math.abs(Number(m.input_i) - TARGET.integrated) > TOLERANCE) {
    problems.push(
      `integrated ${m.input_i} LUFS is more than ${TOLERANCE} LU from ${TARGET.integrated}`,
    )
  }
  if (Number(m.input_tp) > CEILING) problems.push(`true peak ${m.input_tp} dBTP is over ${CEILING}`)
  return problems
}

// When the true-peak limit forces loudnorm into its dynamic mode it lands short of the target. A second
// try aims past -14 by what the first master missed (the 44 s film: -14.68 at -14, -14.29 at -13.4).
export const aimFor = (master: LoudnormReport) => 2 * TARGET.integrated - Number(master.input_i)

export const secondPassFilter = (m: LoudnormReport, integrated = TARGET.integrated) =>
  `${base(integrated)}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:` +
  `measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`
