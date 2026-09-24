import { useEffect, useState, type CSSProperties } from 'react'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

/** How long the splash stays before it starts to fade. */
export const SPLASH_HOLD_MS = 1800
/** Length of the fade-out; matches `splash-out` in index.css. */
export const SPLASH_FADE_MS = 360

/**
 * Opening animation on every cold load: the logo's O and then X draw themselves in on the bare
 * background, the title rises, then the whole thing fades to reveal setup. It stays a phone-width column on wide
 * screens, like the app itself. Reduced motion collapses the animation to a brief still.
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
      className={cn('fixed inset-0 z-50 flex justify-center bg-muted', leaving && 'splash-leave')}
    >
      <div
        aria-hidden="true"
        className="grid w-full max-w-[420px] place-items-center bg-background text-foreground sm:border-x"
      >
        <div className="flex -translate-y-[4vh] flex-col items-center">
          {/* The logo, bare on the background: the O draws itself first, then the X across it. */}
          <Logo animate className="size-56" />
          <p className="splash-rise mt-7 text-4xl font-bold tracking-[-0.03em]" style={{ '--splash-delay': '1000ms' } as CSSProperties}>
            Tic-Tac-Toe
          </p>
          <p className="splash-rise mt-2 text-muted-foreground" style={{ '--splash-delay': '1140ms' } as CSSProperties}>
            Three&rsquo;s a win.
          </p>
        </div>
      </div>
    </div>
  )
}
