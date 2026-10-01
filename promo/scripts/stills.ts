// Renders the verification stills: one per storyboard section-8 check, both formats, half size, into
// handoff/002-promo-video/stills/. `--frames=12,240 --out=<dir>` renders just those frames instead.
import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"
import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import measured from "../../docs/promo/audio/durations.json" with { type: "json" }
import { LAYOUTS } from "../src/layout.ts"
import { type Measured, buildTimeline } from "../src/timeline.ts"

const t = buildTimeline(measured as Measured)
const s = t.shots

const CHECKS: Record<string, number> = {
  "02-first-frame": 0,
  "02-empty-board-title": 50,
  "02-first-x": 84,
  "03-bubble-i-do-this-all-day": t.bot1.from + 12,
  "04-diagonal-strike-confetti": 238,
  "04-lucky-square": t.bot2.from + 12,
  "05-toast": t.toast + 14,
  "06-online-xoxo": s["4a"] + 70,
  "06-one-phone": s["4b"] + 44,
  "06-the-bot": s["4c"] + 82,
  "07-forty-one": s["5"] + 60,
  "08-pills": s["6"] + 96,
  "09-slogan": s["7"] + 70,
  "09-logo-last-frame": 899,
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")))
const stills: [string, number][] = args.frames
  ? args.frames.split(",").map((f: string) => [`frame-${f}`, Number(f)])
  : Object.entries(CHECKS)
const out =
  args.out ?? fileURLToPath(new URL("../../handoff/002-promo-video/stills/", import.meta.url))
mkdirSync(out, { recursive: true })

const serveUrl = await bundle({
  entryPoint: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../docs/promo/audio/", import.meta.url)),
})
const browserExecutable = process.env.REMOTION_CHROME ?? null
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
