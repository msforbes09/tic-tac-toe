import { useCurrentFrame } from "remotion"
import { Column, Shot, text } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { RISE_SLOW, rise } from "../motion"
import type { Beats } from "../timeline"

// Shot 1: "You learned it on a napkin." over the empty board (the board is GameBoard). No title: the splash
// showed it. The sub-line rises with the voice and leaves while the first X draws.
export function Shot1Board({
  layout,
  from,
  to,
  subline,
}: {
  layout: Layout
  from: number
  to: number
  subline: Beats["subline"]
}) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).subline} gap={0}>
        <div style={{ ...text(type.subline), ...rise(frame, subline.at, subline.exit, RISE_SLOW) }}>
          You learned it on a napkin.
        </div>
      </Column>
    </Shot>
  )
}
