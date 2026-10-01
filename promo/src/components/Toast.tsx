import { interpolate, useCurrentFrame } from "remotion"
import { type Layout, TOAST_DROP, TYPE, zones } from "../layout"
import { enter, exit } from "../motion"
import { COLOR, FONT } from "../tokens"

// The achievement toast (src/components/AchievementToast.tsx): drops in from above its zone, leaves upward.
export function Toast({ layout, at, exitAt }: { layout: Layout; at: number; exitAt: number }) {
  const frame = useCurrentFrame()
  const zone = zones(layout).bubble
  const type = TYPE[layout]
  const p = enter(frame, at, 8)
  const out = exit(frame, exitAt)
  const icon = type.toastName * 1.6
  const y = interpolate(p - out, [0, 1], [-TOAST_DROP, 0])

  return (
    <div
      style={{
        position: "absolute",
        left: zone.x,
        top: zone.y,
        width: zone.w,
        height: zone.h,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity: p * (1 - out),
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: type.toastName * 0.5,
          padding: `${type.toastLabel * 0.6}px ${type.toastName * 0.7}px`,
          background: COLOR.card,
          border: `2px solid ${COLOR.border}`,
          borderRadius: 28,
        }}
      >
        <svg width={icon} height={icon} viewBox="0 0 100 100" style={{ flex: "none" }}>
          <circle cx={50} cy={50} r={46} fill={COLOR.bronze} />
          <path
            d="M30 52 L44 66 L71 37"
            fill="none"
            stroke={COLOR.card}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontFamily: FONT.text,
              fontWeight: 600,
              fontSize: type.toastLabel,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: COLOR.muted,
              lineHeight: 1.2,
            }}
          >
            Achievement unlocked
          </span>
          <span
            style={{
              fontFamily: FONT.heading,
              fontWeight: 600,
              fontSize: type.toastName,
              color: COLOR.foreground,
              lineHeight: 1.15,
            }}
          >
            Beat the Machine
          </span>
          <span
            style={{
              fontFamily: FONT.text,
              fontWeight: 600,
              fontSize: type.toastDescription,
              color: COLOR.muted,
              lineHeight: 1.2,
            }}
          >
            Beat the bot for the first time
          </span>
        </div>
      </div>
    </div>
  )
}
