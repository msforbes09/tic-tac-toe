import { useCurrentFrame } from "remotion"
import { LOGO } from "../brand"
import { LOGO_DRAW } from "../draw"
import { enter } from "../motion"
import { COLOR } from "../tokens"

const GAP_MASK = "logo-gap" // one logo on screen at a time (shot 0)

// The app's logo (geometry pinned in brand.ts). Draws O first (from `at`), then each X arm, at the splash's own
// timing (LOGO_DRAW); the X completes at `at + 32`.
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
  const arm1At = at + LOGO_DRAW.x
  const arm2At = arm1At + LOGO_DRAW.arm

  return (
    <svg
      viewBox={`0 0 ${LOGO.size} ${LOGO.size}`}
      width={size}
      height={size}
      style={{ display: "block" }}
    >
      {/* The gap where the X crosses the O: the app paints the crossing arm wider in the background colour;
          here it is cut out of the O with a mask, so the glows behind show through instead of a dark halo. */}
      <mask
        id={GAP_MASK}
        maskUnits="userSpaceOnUse"
        x={0}
        y={0}
        width={LOGO.size}
        height={LOGO.size}
      >
        <rect width={LOGO.size} height={LOGO.size} fill="white" />
        <path
          d={arm1}
          {...common}
          stroke="black"
          strokeWidth={LOGO.stroke + 2 * LOGO.gap}
          {...draw(arm1At, LOGO_DRAW.arm)}
        />
      </mask>
      <g mask={`url(#${GAP_MASK})`}>
        <circle
          cx={o.cx}
          cy={o.cy}
          r={o.r}
          transform={`rotate(-90 ${o.cx} ${o.cy})`}
          stroke={COLOR.o}
          {...common}
          {...draw(at, LOGO_DRAW.o)}
        />
      </g>
      <path d={arm1} {...common} stroke={COLOR.x} {...draw(arm1At, LOGO_DRAW.arm)} />
      <path d={arm2} {...common} stroke={COLOR.x} {...draw(arm2At, LOGO_DRAW.arm)} />
    </svg>
  )
}
