import { useCurrentFrame } from "remotion"
import { type Layout, zones } from "../layout"
import { breathe, enter, exit } from "../motion"
import { OBadge } from "./OBadge"

// The bot thinking above the board (storyboard-v2 shots 1 and 3): the O badge pops in at `at`, breathes
// once, and leaves over 8 frames from `exitAt`, as the O starts to draw.
export function ThinkingBadge({
  layout,
  at,
  exitAt,
}: {
  layout: Layout
  at: number
  exitAt: number
}) {
  const frame = useCurrentFrame()
  const box = zones(layout).thinking
  const p = enter(frame, at, 8)
  const breath = breathe(frame, at)
  return (
    <OBadge
      size={box.w}
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        opacity: p * breath.opacity * (1 - exit(frame, exitAt)),
        transform: `scale(${(0.9 + 0.1 * p) * breath.scale})`,
      }}
    />
  )
}
