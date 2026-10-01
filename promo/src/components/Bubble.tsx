import { interpolate, useCurrentFrame } from "remotion"
import { type Layout, TYPE, zones } from "../layout"
import { enter, exit } from "../motion"
import { COLOR, FONT } from "../tokens"

const BREATH_FRAMES = 33 // the app's 1.1 s "thinking" breath

// The bot's speech bubble above the board, its tail pointing down at `tailX` (the O in cell 0).
export function Bubble({
  layout,
  text,
  popAt,
  exitAt,
  tailX,
  breathe = false,
}: {
  layout: Layout
  text: string
  popAt: number
  exitAt: number
  tailX: number
  breathe?: boolean
}) {
  const frame = useCurrentFrame()
  const zone = zones(layout).bubble
  const size = TYPE[layout].bubble
  const p = enter(frame, popAt, 8)
  const out = exit(frame, exitAt)
  const breath = breathe
    ? interpolate(
        frame,
        [popAt + 8, popAt + 8 + BREATH_FRAMES / 2, popAt + 8 + BREATH_FRAMES],
        [1, 0.88, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 1
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
        <svg
          width={badge}
          height={badge}
          viewBox="0 0 100 100"
          style={{ flex: "none", transform: `scale(${breath})`, opacity: 0.7 + 0.3 * ((breath - 0.88) / 0.12) }}
        >
          <circle cx={50} cy={50} r={46} fill={COLOR.tile} />
          <circle cx={50} cy={50} r={24} fill="none" stroke={COLOR.o} strokeWidth={11} />
        </svg>
        <span style={{ fontFamily: FONT.heading, fontWeight: 600, fontSize: size, color: COLOR.foreground, whiteSpace: "nowrap" }}>
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
