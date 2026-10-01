import { useCurrentFrame } from "remotion"
import { KAYA_MARK } from "../brand"
import { KAYA_DRAW } from "../draw"
import type { Box } from "../layout"
import { enter } from "../motion"

// The Kaya Randomized mark (storyboard-v2 amendment 1), drawn stroke by stroke by dash offset on the app
// easing: each stroke starts at its frame in `at` and is hidden until then, so no round-cap dot shows early.
export function KayaMark({ box, at }: { box: Box; at: number[] }) {
  const frame = useCurrentFrame()
  return (
    <svg
      viewBox={`0 0 ${KAYA_MARK.box} ${KAYA_MARK.box}`}
      width={box.w}
      height={box.h}
      fill="none"
      strokeWidth={KAYA_MARK.stroke}
      strokeLinecap="round"
      style={{ position: "absolute", left: box.x, top: box.y }}
    >
      {KAYA_MARK.strokes.map(({ d, color }, i) => (
        <path
          key={d}
          d={d}
          stroke={color}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - enter(frame, at[i], KAYA_DRAW.stroke)}
          opacity={frame >= at[i] ? 1 : 0}
        />
      ))}
    </svg>
  )
}
