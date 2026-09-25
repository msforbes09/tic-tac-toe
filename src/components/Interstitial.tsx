import { useEffect, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** How long a splash without buttons stays before it reports done. */
export const INTERSTITIAL_MS = 2000

export type InterstitialAction = { label: string; onClick: () => void; primary?: boolean }

export type InterstitialProps = {
  title: string
  subtitle?: string
  /** With actions the splash waits for a tap; without them it dismisses itself. */
  actions?: InterstitialAction[]
  durationMs?: number
  onDone?: () => void
}

/**
 * A full-column splash in the opening splash's style: "Alice vs Bob" when a series starts,
 * "Tie breaker" at sudden death, and the result at the end.
 */
export function Interstitial({ title, subtitle, actions, durationMs = INTERSTITIAL_MS, onDone }: InterstitialProps) {
  const waitsForTap = (actions?.length ?? 0) > 0

  useEffect(() => {
    if (waitsForTap || !onDone) return
    const id = setTimeout(onDone, durationMs)
    return () => clearTimeout(id)
  }, [waitsForTap, durationMs, onDone])

  return (
    <div role="status" className="fixed inset-0 z-50 flex justify-center bg-muted">
      <div className="grid w-full max-w-[420px] place-items-center bg-background px-6 text-foreground sm:border-x">
        <div className="flex w-full -translate-y-[4vh] flex-col items-center gap-6 text-center">
          <p className="splash-rise text-4xl font-bold tracking-[-0.03em]" style={{ '--splash-delay': '0ms' } as CSSProperties}>
            {title}
          </p>
          {subtitle && (
            <p className="splash-rise text-lg text-muted-foreground" style={{ '--splash-delay': '140ms' } as CSSProperties}>
              {subtitle}
            </p>
          )}
          {waitsForTap && (
            <div className="splash-rise flex w-full flex-col gap-3 pt-2" style={{ '--splash-delay': '280ms' } as CSSProperties}>
              {actions!.map((a) => (
                <Button
                  key={a.label}
                  size="lg"
                  variant={a.primary ? 'default' : 'outline'}
                  className={cn('min-h-14 w-full rounded-[18px] text-base font-semibold', a.primary && 'cta')}
                  onClick={a.onClick}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
