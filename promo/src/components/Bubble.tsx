import { useCurrentFrame } from "remotion"
import { boardGeometry } from "./Board"
import { OBadge } from "./OBadge"
import { type Layout, TYPE, zones } from "../layout"
import { breathe, enter, exit } from "../motion"
import { COLOR, FONT } from "../tokens"

// The bot's speech bubble above the board, its tail pointing down at the O in cell 0.
export function Bubble({
  layout,
  text,
  popAt,
  exitAt,
  breathes = false,
}: {
  layout: Layout
  text: string
  popAt: number
  exitAt: number
  breathes?: boolean
}) {
  const frame = useCurrentFrame()
  const zone = zones(layout).bubble
  const board = zones(layout).board
  const tailX = board.x + boardGeometry(board.w).centre(0).x
  const size = TYPE[layout].bubble
  const p = enter(frame, popAt, 8)
  const out = exit(frame, exitAt)
  // The badge breathes once from the pop (storyboard-v2 shot 2), or stays still.
  const badgeBreath = breathes ? breathe(frame, popAt) : { scale: 1, opacity: 1 }
  const badge = size * 1.25
  const tail = size * 0.45

  return (
    <div
      style={{
        position: "absolute",
        left: zone.x,
        top: zone.y,
        width: zone.w,
        height: zone.h - tail,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        opacity: p * (1 - out),
        transform: `scale(${0.92 + 0.08 * p})`,
        transformOrigin: `${tailX - zone.x}px 100%`,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: size * 0.4,
          padding: `${size * 0.35}px ${size * 0.6}px`,
          background: COLOR.card,
          border: `2px solid ${COLOR.border}`,
          borderRadius: 40,
        }}
      >
        <OBadge
          size={badge}
          style={{
            flex: "none",
            transform: `scale(${badgeBreath.scale})`,
            opacity: badgeBreath.opacity,
          }}
        />
        <span
          style={{
            fontFamily: FONT.heading,
            fontWeight: 600,
            fontSize: size,
            color: COLOR.foreground,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </span>
      </div>
      <svg
        width={tail * 1.6}
        height={tail}
        viewBox="0 0 16 10"
        style={{ position: "absolute", left: tailX - zone.x - tail * 0.8, top: zone.h - tail - 2 }}
      >
        <path d="M0 0 L16 0 L3 10 Z" fill={COLOR.card} />
        <path d="M0 0 L3 10 L16 0" fill="none" stroke={COLOR.border} strokeWidth={0.25} />
      </svg>
    </div>
  )
}
