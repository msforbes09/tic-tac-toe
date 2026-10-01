import { useCurrentFrame } from "remotion"
import { KayaMark } from "../components/KayaMark"
import { Column, heading, Shot, text } from "../components/Shot"
import { type Layout, MARK_SETTLE, TYPE, zones } from "../layout"
import { enter, rise } from "../motion"
import { type Beats, FPS, TOTAL_FRAMES } from "../timeline"
import { COLOR } from "../tokens"

const URL_FRAMES = 12
const SETTLE_FRAMES = 3 * FPS // the stack eases down over the last 3 s

// Shot 8: the Kaya Randomized mark draws stroke by stroke (amendment 1) over "Kaya Randomized" and, once
// that rises, the site's address in a quiet line (owner ruling, 2026-10-01). Holds to the last frame.
export function Shot8Mark({ layout, from, beats }: { layout: Layout; from: number; beats: Beats }) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  const kaya = zones(layout).kaya
  const settle = MARK_SETTLE * enter(frame, TOTAL_FRAMES - SETTLE_FRAMES, SETTLE_FRAMES)
  return (
    <Shot from={from}>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${settle}px)` }}>
        <KayaMark box={kaya.mark} at={beats.mark} />
        <Column box={kaya.wordmark} gap={0}>
          <div style={{ ...heading(type.wordmark), ...rise(frame, beats.wordmark) }}>
            Kaya Randomized
          </div>
        </Column>
        <Column box={kaya.url} gap={0}>
          <div
            style={{
              ...text(type.url, COLOR.muted),
              ...rise(frame, beats.url, Infinity, URL_FRAMES),
            }}
          >
            tictactoe.kayarandomized.com
          </div>
        </Column>
      </div>
    </Shot>
  )
}
