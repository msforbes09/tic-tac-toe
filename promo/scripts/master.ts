// node scripts/master.ts <rendered.mp4> <final.mp4>
// Masters the rendered mix to the loudness target (two-pass loudnorm), copies the video stream untouched,
// encodes AAC, and drops all container metadata. Prints the final measurement.
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { measureFilter, parseLoudnorm, secondPassFilter } from "../src/loudness.ts"
import { FPS, TOTAL_FRAMES } from "../src/timeline.ts"

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error("usage: node scripts/master.ts <rendered.mp4> <final.mp4>")
  process.exit(1)
}

const remotion = fileURLToPath(new URL("../node_modules/.bin/remotion", import.meta.url))

// Runs Remotion's bundled ffmpeg and returns its stderr, where loudnorm reports.
function ffmpeg(args: string[]): string {
  const run = spawnSync(remotion, ["ffmpeg", "-hide_banner", "-nostats", ...args], { encoding: "utf8" })
  if (run.status !== 0) throw new Error(`ffmpeg failed:\n${run.stderr.slice(-2000)}`)
  return run.stderr
}

const measure = (file: string) =>
  parseLoudnorm(ffmpeg(["-i", file, "-vn", "-af", measureFilter(), "-f", "null", "-"]))

const first = measure(input)
const second = parseLoudnorm(
  ffmpeg([
    "-y",
    "-i",
    input,
    "-map",
    "0:v",
    "-map",
    "0:a",
    "-c:v",
    "copy",
    "-af",
    secondPassFilter(first),
    "-ar",
    "48000",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(TOTAL_FRAMES / FPS),
    "-map_metadata",
    "-1",
    "-movflags",
    "+faststart",
    output,
  ]),
)
const final = measure(output)
console.log(
  `master: ${output}: ${final.input_i} LUFS integrated, ${final.input_tp} dBTP true peak ` +
    `(mix was ${first.input_i} LUFS; ${second.normalization_type} normalisation)`,
)
