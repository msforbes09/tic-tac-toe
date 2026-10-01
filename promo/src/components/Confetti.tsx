import { interpolate, random, useCurrentFrame } from "remotion"
import { COLOR } from "../tokens"

const PIECES = 28
const FRAMES = 33 // 1.1 s, as the app's burst
const FALL = 80

// One burst of X- and O-coloured confetti from (x, y), as src/index.css's confetti-burst.
export function Confetti({
  x,
  y,
  at,
  spread,
}: {
  x: number
  y: number
  at: number
  spread: number
}) {
  const frame = useCurrentFrame()
  const t = (frame - at) / FRAMES
  if (t < 0 || t > 1) return null
  const travel = interpolate(t, [0, 1], [0, 1], {
    easing: (v) => 1 - (1 - v) ** 4,
  })
  const opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
  return (
    <>
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = random(`angle-${i}`) * Math.PI * 2
        const distance = spread * (0.45 + random(`distance-${i}`) * 0.55)
        const dx = Math.cos(angle) * distance * travel
        const dy = Math.sin(angle) * distance * travel + FALL * t * t
        const spin = (random(`spin-${i}`) - 0.5) * 720 * travel
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 8,
              top: y - 12,
              width: 16,
              height: 24,
              borderRadius: 3,
              background: i % 2 === 0 ? COLOR.x : COLOR.o,
              opacity,
              transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(${0.6 + 0.4 * travel})`,
            }}
          />
        )
      })}
    </>
  )
}
