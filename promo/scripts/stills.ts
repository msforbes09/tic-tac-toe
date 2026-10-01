// Renders the verification stills: one per storyboard section-8 check, both formats, half size, into
// handoff/004-promo-recut/stills/. `--frames=12,240 --out=<dir>` renders just those frames instead.
import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"
import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import measured from "../../docs/promo/audio/durations.json" with { type: "json" }
import { browserExecutable as installedChrome } from "../chrome.ts"
import { LAYOUTS } from "../src/layout.ts"
import { type Measured, TOTAL_FRAMES, buildTimeline } from "../src/timeline.ts"

const t = buildTimeline(measured as Measured)
const s = t.shots

// Keyed by the storyboard-v2 section-8 check each still shows (13 as amended by amendment 1).
const CHECKS: Record<string, number> = {
  "02-splash-first-frame": 0,
  "02-splash-o-drawing": 8,
  "02-splash-x-done": 33,
  "02-splash-poster": 90,
  "02-splash-out": t.beats.splash.exit + 5,
  "03-board-no-title-subline": 140,
  "03-first-x": 170,
  "04-thinking-badge": t.beats.thinking[0] + 16,
  "04-first-o": 224,
  "05-bubble-i-do-this-all-day": t.bot1.from + 20,
  "06-diagonal-win-tiles-confetti": 455,
  "07-lucky-square-over-tiles": t.bot2.from + 20,
  "08-toast": t.toast + 30,
  "09-online-xoxo": s["4b"] - 10,
  "09-one-phone": s["4c"] - 10,
  "09-the-bot-hard": s["5"] - 10,
  "10-forty-one-wall": s["6"] - 10,
  "11-pills": s["7"] - 10,
  "12-slogan": s["8"] - 10,
  "13-kaya-mark-drawing": t.beats.mark[1] + 4,
  "13-kaya-mark-done": t.beats.markDone,
  "13-last-frame": TOTAL_FRAMES - 1,
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")))
const stills: [string, number][] = args.frames
  ? args.frames.split(",").map((f: string) => [`frame-${f}`, Number(f)])
  : Object.entries(CHECKS)
const out =
  args.out ?? fileURLToPath(new URL("../../handoff/004-promo-recut/stills/", import.meta.url))
mkdirSync(out, { recursive: true })

const serveUrl = await bundle({
  entryPoint: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../docs/promo/audio/", import.meta.url)),
})
const browserExecutable = installedChrome()
const chromeMode = browserExecutable ? "chrome-for-testing" : "headless-shell"

for (const layout of LAYOUTS) {
  const inputProps = { layout }
  const composition = await selectComposition({
    serveUrl,
    id: "Promo",
    inputProps,
    browserExecutable,
    chromeMode,
  })
  for (const [name, frame] of stills) {
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      frame,
      scale: 0.5,
      output: `${out}/${layout}-${name}-f${frame}.png`,
      browserExecutable,
      chromeMode,
    })
    console.log(`stills: ${layout} ${name} (frame ${frame})`)
  }
}
