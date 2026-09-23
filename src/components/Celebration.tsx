import type { CSSProperties } from 'react'

// Fixed, hand-tuned spread so the burst looks the same every time and renders identically in tests.
const PIECES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2
  const distance = 120 + ((i * 37) % 90)
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance * 0.8 - 60),
    spin: ((i * 53) % 540) - 270,
    delay: (i % 5) * 25,
    color: i % 2 === 0 ? 'var(--player-x)' : 'var(--player-o)',
    round: i % 3 === 0,
  }
})

/**
 * A short confetti burst from the middle of the board. Purely decorative, and
 * hidden entirely for players who ask for reduced motion (see index.css).
 */
export function Celebration() {
  return (
    <div data-testid="celebration" aria-hidden="true" className="confetti pointer-events-none absolute inset-0 overflow-visible">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute left-1/2 top-1/2"
          style={
            {
              '--x': `${p.x}px`,
              '--y': `${p.y}px`,
              '--spin': `${p.spin}deg`,
              animationDelay: `${p.delay}ms`,
              background: p.color,
              borderRadius: p.round ? '999px' : '2px',
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
