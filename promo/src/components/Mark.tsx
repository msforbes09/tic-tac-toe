import { useCurrentFrame } from "remotion"
import { enter } from "../motion"
import type { Player } from "../timeline"
import { COLOR } from "../tokens"

const ARM_FRAMES = 8
const O_FRAMES = 10

// An X or O drawn as a stroke from `at` (X: two 8-frame arms, one after the other; O: 10 frames).
export function Mark({ player, at, size }: { player: Player; at: number; size: number }) {
  const frame = useCurrentFrame()
  const common = {
    fill: "none",
    strokeWidth: 13,
    strokeLinecap: "round" as const,
    pathLength: 1,
    strokeDasharray: 1,
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      {player === "X" ? (
        <g stroke={COLOR.x}>
          <line x1={24} y1={24} x2={76} y2={76} {...common} strokeDashoffset={1 - enter(frame, at, ARM_FRAMES)} />
          <line
            x1={76}
            y1={24}
            x2={24}
            y2={76}
            {...common}
            strokeDashoffset={1 - enter(frame, at + ARM_FRAMES, ARM_FRAMES)}
          />
        </g>
      ) : (
        <circle
          cx={50}
          cy={50}
          r={27}
          stroke={COLOR.o}
          transform="rotate(-90 50 50)"
          {...common}
          strokeDashoffset={1 - enter(frame, at, O_FRAMES)}
        />
      )}
    </svg>
  )
}

export const markDone = (player: Player, at: number) =>
  at + (player === "X" ? 2 * ARM_FRAMES : O_FRAMES)
