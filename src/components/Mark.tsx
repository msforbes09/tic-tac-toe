import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Player } from '@/lib/types'

// Stroke lengths for the 100×100 viewBox below, used to pay out the dash animation.
const X_STROKE_LEN = 80
const O_STROKE_LEN = 189

export type MarkProps = {
  player: Player
  /** Play the draw-in animation on mount. */
  animate?: boolean
  /** Stroke width in viewBox units; it scales with the rendered size. */
  weight?: number
  className?: string
}

/**
 * X and O drawn as strokes, not typed as letters. Colour comes from
 * `currentColor`, so callers set `text-player-x` / `text-player-o`.
 */
export function Mark({ player, animate = false, weight = 12, className }: MarkProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: weight,
    strokeLinecap: 'round' as const,
  }

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      {player === 'X' ? (
        <>
          <path
            d="M24 24 L76 76"
            {...common}
            className={cn(animate && 'mark-draw')}
            style={{ '--mark-len': X_STROKE_LEN } as CSSProperties}
          />
          <path
            d="M76 24 L24 76"
            {...common}
            className={cn(animate && 'mark-draw')}
            style={{ '--mark-len': X_STROKE_LEN, '--mark-delay': '110ms' } as CSSProperties}
          />
        </>
      ) : (
        <circle
          cx="50"
          cy="50"
          r="30"
          transform="rotate(-90 50 50)"
          {...common}
          className={cn(animate && 'mark-draw')}
          style={{ '--mark-len': O_STROKE_LEN, '--mark-duration': '380ms' } as CSSProperties}
        />
      )}
    </svg>
  )
}
