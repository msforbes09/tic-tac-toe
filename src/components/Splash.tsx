import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Logo } from './Logo'
import type { Feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'

/** How long the splash stays before it starts to fade. */
export const SPLASH_HOLD_MS = 1800
/** Length of the fade-out; matches `splash-out` in index.css. */
export const SPLASH_FADE_MS = 360
/** The year on the splash's copyright line; the build year, not the visitor's clock. */
const COPYRIGHT_YEAR = 2026

/**
 * Opening animation on every cold load: the logo's O and then X draw themselves in on the bare
 * background, the title rises, then the whole thing fades to reveal setup. It stays a phone-width column on wide
 * screens, like the app itself. Reduced motion collapses the animation to a brief still.
 */
export function Splash({ onDone, feedback }: { onDone: () => void; feedback?: Feedback }) {
  const [leaving, setLeaving] = useState(false)

  // Once, on mount: the cue is timed to the animation, which only plays once too.
  const cue = useRef(feedback)
  useEffect(() => {
    cue.current?.play({ kind: 'splash' })
  }, [])

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
        className="relative grid w-full max-w-[420px] place-items-center bg-background text-foreground sm:border-x"
      >
        <div className="flex -translate-y-[4vh] flex-col items-center">
          {/* The logo, bare on the background: the O draws itself first, then the X across it. */}
          <Logo animate className="size-56" />
          <p className="splash-rise mt-7 font-heading text-[2.6rem] font-semibold tracking-[-0.01em]" style={{ '--splash-delay': '1000ms' } as CSSProperties}>
            Tic-Tac-Toe
          </p>
          <p className="splash-rise mt-2 text-muted-foreground" style={{ '--splash-delay': '1140ms' } as CSSProperties}>
            Win three.
          </p>
        </div>
        <p data-testid="splash-footer" className="absolute bottom-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground/70">
          v{__APP_VERSION__} · © {COPYRIGHT_YEAR} iam4bs
        </p>
      </div>
    </div>
  )
}
