import { useCurrentFrame } from "remotion"
import { LOGO } from "../brand"
import { DRAW } from "../draw"
import { enter } from "../motion"
import { COLOR } from "../tokens"

// The app's logo (geometry pinned in brand.ts). Draws O first (from `at`), then each X arm, as the splash does; the X completes at `at + 26`.
export function Logo({ at, size }: { at: number; size: number }) {
  const frame = useCurrentFrame()
  const { x, o } = LOGO
  const draw = (from: number, length: number) => ({
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1 - enter(frame, from, length),
  })
  const common = { fill: "none", strokeWidth: LOGO.stroke, strokeLinecap: "round" as const }
  const arm1 = `M${x.cx - x.arm} ${x.cy - x.arm} L${x.cx + x.arm} ${x.cy + x.arm}`
  const arm2 = `M${x.cx + x.arm} ${x.cy - x.arm} L${x.cx - x.arm} ${x.cy + x.arm}`
  const arm1At = at + DRAW.o
  const arm2At = arm1At + DRAW.arm

  return (
    <svg
      viewBox={`0 0 ${LOGO.size} ${LOGO.size}`}
      width={size}
      height={size}
      style={{ display: "block" }}
    >
      <circle
        cx={o.cx}
        cy={o.cy}
        r={o.r}
        transform={`rotate(-90 ${o.cx} ${o.cy})`}
        stroke={COLOR.o}
        {...common}
        {...draw(at, DRAW.o)}
      />
      <path
        d={arm1}
        {...common}
        stroke={COLOR.background}
        strokeWidth={LOGO.stroke + 2 * LOGO.gap}
        {...draw(arm1At, DRAW.arm)}
      />
      <path d={arm1} {...common} stroke={COLOR.x} {...draw(arm1At, DRAW.arm)} />
      <path d={arm2} {...common} stroke={COLOR.x} {...draw(arm2At, DRAW.arm)} />
    </svg>
  )
}
