import { interpolate, useCurrentFrame } from "remotion"
import { CANVAS, type Layout } from "../layout"
import { TOTAL_FRAMES } from "../timeline"
import { COLOR } from "../tokens"

// Two soft glows (src/index.css .room-glow): X colour top-left, O colour bottom-right, each 38%, blurred,
// drifting at most 6% of the canvas over the film. In the 9:16 they fill the unsafe top and bottom bands.
// Drift: 5% across and 2.5% down, about 5.6% of the canvas in all.
const DRIFT = 0.05

export function Glows({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame()
  const { width, height } = CANVAS[layout]
  const d = interpolate(frame, [0, TOTAL_FRAMES], [0, DRIFT])
  const size = layout === "reel" ? 1300 : 1000
  const glow = (color: string, cx: number, cy: number) => (
    <div
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        filter: "blur(40px)",
        background: `radial-gradient(circle, color-mix(in srgb, ${color} 38%, transparent) 0%, transparent 62%)`,
      }}
    />
  )
  return (
    <>
      {glow(COLOR.x, width * (0.1 + d), height * (layout === "reel" ? 0.03 : 0.05) + height * d * 0.5)}
      {glow(COLOR.o, width * (0.9 - d), height * (layout === "reel" ? 0.97 : 0.95) - height * d * 0.5)}
    </>
  )
}
