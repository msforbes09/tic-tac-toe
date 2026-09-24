import type { CSSProperties } from 'react'
import { LOGO } from '@/lib/logo'
import { cn } from '@/lib/utils'

// Stroke lengths in LOGO units, used to pay out the draw-in animation.
const X_STROKE_LEN = Math.round(2 * LOGO.x.arm * Math.SQRT2)
const O_STROKE_LEN = Math.round(2 * Math.PI * LOGO.o.r)

/** When the X starts drawing; the O is drawn first and this leaves room for it. */
const X_DELAY_MS = 520

/**
 * The app logo as inline SVG: the O, then the X on top with its arm crossing the ring.
 * Same geometry as `public/icon.svg`, without the tile. With `animate`, the marks draw
 * themselves in on mount, O first.
 */
export function Logo({ animate = false, className }: { animate?: boolean; className?: string }) {
  const { x, o } = LOGO
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: LOGO.stroke,
    strokeLinecap: 'round' as const,
  }
  const mark = (player: 'X' | 'O', delay: number) => ({
    'data-player': player,
    className: cn(player === 'X' ? 'text-player-x' : 'text-player-o', animate && 'logo-mark'),
    style: animate ? ({ '--logo-delay': `${delay}ms` } as CSSProperties) : undefined,
  })

  return (
    <svg
      viewBox={`0 0 ${LOGO.size} ${LOGO.size}`}
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g {...mark('O', 0)}>
        <circle
          cx={o.cx}
          cy={o.cy}
          r={o.r}
          transform={`rotate(-90 ${o.cx} ${o.cy})`}
          {...common}
          style={{ '--mark-len': O_STROKE_LEN, '--mark-duration': '480ms' } as CSSProperties}
        />
      </g>
      <g {...mark('X', X_DELAY_MS)}>
        <path d={`M${x.cx - x.arm} ${x.cy - x.arm} L${x.cx + x.arm} ${x.cy + x.arm}`} {...common} style={{ '--mark-len': X_STROKE_LEN } as CSSProperties} />
        <path d={`M${x.cx + x.arm} ${x.cy - x.arm} L${x.cx - x.arm} ${x.cy + x.arm}`} {...common} style={{ '--mark-len': X_STROKE_LEN } as CSSProperties} />
      </g>
    </svg>
  )
}
