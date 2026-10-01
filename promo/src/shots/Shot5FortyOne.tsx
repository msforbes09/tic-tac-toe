import { interpolate, useCurrentFrame } from "remotion"
import { TIERS } from "../brand"
import { Column, heading, Shot, text } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { enter, pop, rise } from "../motion"
import { type Beats, CHIP_COUNT } from "../timeline"

// Chips in unlock order, bronze first, platinum last.
const CHIPS = TIERS.flatMap((t) => Array<string>(t.count).fill(t.color))
const PER_ROW = 14
const GLOW_FRAMES = 6

// Shot 5: "41", "achievements to unlock", and a wall of 41 tier-coloured chips, platinum last with a glow.
export function Shot5FortyOne({
  layout,
  from,
  to,
  beats,
}: {
  layout: Layout
  from: number
  to: number
  beats: Beats
}) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  const chip = layout === "reel" ? 46 : 36
  const scale = 0.94 + 0.06 * enter(frame, from + 2)
  const platinumAt = beats.platinum
  const glow = interpolate(
    frame,
    [platinumAt + 8, platinumAt + 8 + GLOW_FRAMES / 2, platinumAt + 8 + GLOW_FRAMES],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  )
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).content} gap={type.numeralLabel * 0.3}>
        <div
          style={{
            ...heading(type.numeral),
            lineHeight: 0.9,
            opacity: enter(frame, from + 2),
            transform: `scale(${scale})`,
          }}
        >
          41
        </div>
        <div style={{ ...text(type.numeralLabel), ...rise(frame, from + 6) }}>
          achievements to unlock
        </div>
        <div
          style={{
            marginTop: type.numeralLabel * 0.6,
            display: "grid",
            gridTemplateColumns: `repeat(${PER_ROW}, ${chip}px)`,
            gap: chip * 0.38,
          }}
        >
          {CHIPS.map((color, i) => (
            <div
              key={i}
              style={{
                width: chip,
                height: chip,
                borderRadius: "50%",
                background: color,
                boxShadow:
                  i === CHIP_COUNT - 1
                    ? `0 0 ${chip * glow}px ${chip * 0.4 * glow}px ${color}`
                    : undefined,
                ...pop(frame, beats.chips + i, 0.6),
              }}
            />
          ))}
        </div>
      </Column>
    </Shot>
  )
}
