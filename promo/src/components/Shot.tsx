import type { CSSProperties, ReactNode } from "react"
import { AbsoluteFill, useCurrentFrame } from "remotion"
import { exit } from "../motion"
import { SLIDE } from "../layout"
import { COLOR, EXIT_FRAMES, FONT } from "../tokens"

// A shot on the film's own frame clock: shown from `from`, and from `to` it crossfades out, sliding SLIDE px
// down over 8 frames while the next shot comes in. Without `to` it holds to the last frame.
export function Shot({
  from,
  to = Infinity,
  children,
}: {
  from: number
  to?: number
  children: ReactNode
}) {
  const frame = useCurrentFrame()
  if (frame < from || frame >= to + EXIT_FRAMES) return null
  const out = exit(frame, to)
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${out * SLIDE}px)` }}>
      {children}
    </AbsoluteFill>
  )
}

// Fredoka 600 for headings, Nunito 700 for text (storyboard type table).
export const heading = (size: number, color = COLOR.foreground): CSSProperties => ({
  fontFamily: FONT.heading,
  fontWeight: 600,
  fontSize: size,
  color,
  lineHeight: 1.05,
  whiteSpace: "nowrap",
})

export const text = (size: number, color = COLOR.muted): CSSProperties => ({
  fontFamily: FONT.text,
  fontWeight: 700,
  fontSize: size,
  color,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
})

// A flex column centred in a zone.
export function Column({
  box,
  gap,
  children,
}: {
  box: { x: number; y: number; w: number; h: number }
  gap: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap,
      }}
    >
      {children}
    </div>
  )
}
