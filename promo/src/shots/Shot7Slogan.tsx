import { useCurrentFrame } from "remotion"
import { Mark } from "../components/Mark"
import { Column, heading, Shot } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { enter, rise } from "../motion"
import { BEATS } from "../timeline"
import { COLOR } from "../tokens"

const MARKS_AT = 4
const MARK_STAGGER = 6
const STRIKE_FRAMES = 12

// Shot 7: three Xs in a row, struck through, over "Three in a row." / "Zero excuses."
export function Shot7Slogan({
  layout,
  from,
  to,
  zeroAt,
}: {
  layout: Layout
  from: number
  to: number
  zeroAt: number
}) {
  const frame = useCurrentFrame()
  const size = TYPE[layout].slogan
  const tile = layout === "reel" ? 170 : 124
  const gap = tile * 0.1
  const rowWidth = 3 * tile + 2 * gap
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).content} gap={size * 0.1}>
        <div style={{ position: "relative", display: "flex", gap, marginBottom: size * 0.35 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: tile,
                height: tile,
                borderRadius: tile * 0.14,
                background: COLOR.tile,
                ...rise(frame, from + MARKS_AT + i * MARK_STAGGER),
              }}
            >
              <Mark player="X" at={from + MARKS_AT + i * MARK_STAGGER} size={tile} />
            </div>
          ))}
          <svg width={rowWidth} height={tile} style={{ position: "absolute", left: 0, top: 0 }}>
            <line
              x1={tile * 0.25}
              y1={tile / 2}
              x2={rowWidth - tile * 0.25}
              y2={tile / 2}
              stroke={COLOR.x}
              strokeWidth={gap * 1.6}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - enter(frame, from + BEATS.strike, STRIKE_FRAMES)}
            />
          </svg>
        </div>
        <div style={{ ...heading(size), ...rise(frame, from + MARKS_AT) }}>Three in a row.</div>
        <div style={{ ...heading(size, COLOR.o), ...rise(frame, zeroAt) }}>Zero excuses.</div>
      </Column>
    </Shot>
  )
}
