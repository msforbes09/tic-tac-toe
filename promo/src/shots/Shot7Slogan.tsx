import { useCurrentFrame } from "remotion"
import { winTile } from "../components/Board"
import { Mark } from "../components/Mark"
import { Column, heading, Shot } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { rise } from "../motion"
import { type Beats, SLOGAN_STAGGER } from "../timeline"
import { COLOR } from "../tokens"

const LINE1_AT = 2

// Shot 7: three Xs in a row that light up as a win, as the app's winning tiles do, over
// "Three in a row." / "Zero excuses."
export function Shot7Slogan({
  layout,
  from,
  to,
  zeroAt,
  beats,
}: {
  layout: Layout
  from: number
  to: number
  zeroAt: number
  beats: Beats
}) {
  const frame = useCurrentFrame()
  const size = TYPE[layout].slogan
  const tile = layout === "reel" ? 170 : 124
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).content} gap={size * 0.1}>
        <div style={{ display: "flex", gap: tile * 0.1, marginBottom: size * 0.35 }}>
          {[0, 1, 2].map((i) => {
            const at = beats.slogan + i * SLOGAN_STAGGER
            const arrive = rise(frame, at)
            const win = winTile(frame, beats.rowWin, i, tile)
            return (
              <div
                key={i}
                style={{
                  width: tile,
                  height: tile,
                  borderRadius: tile * 0.14,
                  ...win,
                  opacity: arrive.opacity,
                  transform: `${arrive.transform} ${win.transform}`,
                }}
              >
                <Mark player="X" at={at} size={tile} />
              </div>
            )
          })}
        </div>
        <div style={{ ...heading(size), ...rise(frame, from + LINE1_AT) }}>Three in a row.</div>
        <div style={{ ...heading(size, COLOR.o), ...rise(frame, zeroAt, Infinity, 13) }}>
          Zero excuses.
        </div>
      </Column>
    </Shot>
  )
}
