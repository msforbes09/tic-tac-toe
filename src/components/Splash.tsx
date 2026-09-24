import { useEffect, useState, type CSSProperties } from 'react'
import { Mark } from './Mark'
import { cn } from '@/lib/utils'

/** How long the splash stays before it starts to fade. */
export const SPLASH_HOLD_MS = 1500
/** Length of the fade-out; matches `splash-out` in index.css. */
export const SPLASH_FADE_MS = 360

const TILES = [
  { player: 'X', delay: 0 },
  { player: 'O', delay: 90 },
  { player: 'X', delay: 180 },
] as const

/**
 * Opening animation on every cold load: the three-tile motif pops in, the marks draw, the title
 * rises, then the whole thing fades to reveal setup. Reduced motion skips the animation and just
 * holds the still image briefly.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), SPLASH_HOLD_MS)
    const fade = setTimeout(onDone, SPLASH_HOLD_MS + SPLASH_FADE_MS)
    return () => {
      clearTimeout(hold)
      clearTimeout(fade)
    }
  }, [onDone])

  return (
    <div
      role="status"
      aria-label="Tic-Tac-Toe"
      className={cn(
        'fixed inset-0 z-50 grid place-items-center bg-background text-foreground',
        leaving && 'splash-leave',
      )}
    >
      <div aria-hidden="true" className="flex -translate-y-[4vh] flex-col items-center">
        <div aria-hidden="true" className="grid grid-cols-3 gap-2.5">
          {TILES.map((tile, i) => (
            <span
              key={i}
              className={cn(
                'splash-tile flex size-[72px] items-center justify-center rounded-[22%]',
                tile.player === 'X' ? 'bg-player-x-soft text-player-x' : 'bg-player-o-soft text-player-o',
              )}
              style={{ '--splash-delay': `${tile.delay}ms` } as CSSProperties}
            >
              <span
                className="splash-mark block size-10"
                style={{ '--splash-delay': `${260 + tile.delay * 1.2}ms` } as CSSProperties}
              >
                <Mark player={tile.player} weight={15} className="size-10" />
              </span>
            </span>
          ))}
        </div>
        <p className="splash-rise mt-7 text-4xl font-bold tracking-[-0.03em]" style={{ '--splash-delay': '620ms' } as CSSProperties}>
          Tic-Tac-Toe
        </p>
        <p className="splash-rise mt-2 text-muted-foreground" style={{ '--splash-delay': '760ms' } as CSSProperties}>
          Three in a row wins.
        </p>
      </div>
    </div>
  )
}
