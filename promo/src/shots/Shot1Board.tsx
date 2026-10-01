import { useCurrentFrame } from "remotion"
import { Column, Shot, text } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { rise } from "../motion"

const RISE_FRAMES = 13
const LEAVE_AFTER = 51 // the sub-line leaves at 168, while X is drawing (storyboard-v2 shot 1)

// Shot 1: "You learned it on a napkin." over the empty board (the board is GameBoard). No title: the splash
// showed it. The sub-line rises with the voice.
export function Shot1Board({
  layout,
  from,
  to,
  sublineAt,
}: {
  layout: Layout
  from: number
  to: number
  sublineAt: number
}) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).title} gap={0}>
        <div
          style={{
            ...text(type.subline),
            ...rise(frame, sublineAt, sublineAt + LEAVE_AFTER, RISE_FRAMES),
          }}
        >
          You learned it on a napkin.
        </div>
      </Column>
    </Shot>
  )
}
