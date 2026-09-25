import { useState, type ReactNode } from 'react'
import { Mark } from './Mark'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { KnockEvent } from '@/lib/knock'
import { rungForSelection } from '@/lib/ladder'
import { cn } from '@/lib/utils'
import { SETUP_HINTS, type Tone } from '@/lib/banter'
import { DEFAULT_SETTINGS } from '@/lib/setup'
import type { Difficulty, Mode, Player, Settings } from '@/lib/types'

/** Online is available when Supabase is configured; the app supplies the panel shown under the mode toggle. */
export type OnlineSetup = { available: boolean; panel: ReactNode }

/** The install nudge: a one-tap prompt where the browser offers one, manual steps on iPhone. */
export type InstallOffer = { kind: 'prompt' | 'ios-steps'; onInstall: () => void; onDismiss: () => void }

const NO_ONLINE: OnlineSetup = { available: false, panel: null }

export type SetupScreenProps = {
  /** Preselected choices, e.g. the last setup played. */
  initial?: Settings
  onStart: (settings: Settings) => void
  onOpenHistory: () => void
  /** Online play, when Supabase is configured. */
  online?: OnlineSetup
  /** Shown when the app can be added to the home screen and has not been dismissed lately. */
  install?: InstallOffer
  onModeChange?: (mode: Mode) => void
  /** Developer mode: the saved rung, shown next to Difficulty with where the picked band lands. */
  dev?: { rung: number | null }
  /** Reports taps that are steps of the developer knock. */
  onKnock?: (event: KnockEvent) => void
  /** The bot's tone, for the difficulty hints. */
  tone?: Tone
  /** When set, a gear in the header opens Settings. */
  onOpenSettings?: () => void
}

/** "Difficulty · 25 → 20": the saved rung and, when the picked band would move it, where it lands. */
function devDifficultyLabel(rung: number | null, band: Difficulty): string {
  const lands = rungForSelection(rung, band)
  const current = rung === null ? '–' : String(rung)
  return lands === rung ? `Difficulty · ${current}` : `Difficulty · ${current} → ${lands}`
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const segmentItem =
  'min-h-12 rounded-[14px] text-[15px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150 ' +
  'hover:bg-transparent hover:text-foreground ' +
  'aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_0_rgb(0_0_0/0.08),0_0_0_1px_var(--tile-edge)] ' +
  'dark:aria-pressed:bg-card dark:aria-pressed:shadow-[0_0_0_1px_var(--tile-edge)]'

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="font-heading text-base font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  )
}

export function SetupScreen({
  initial = DEFAULT_SETTINGS,
  onStart,
  onOpenHistory,
  online = NO_ONLINE,
  install,
  onModeChange,
  dev,
  onKnock,
  tone = 'friendly',
  onOpenSettings,
}: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>(initial.mode === 'online' && !online.available ? 'pvp' : initial.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const [symbol, setSymbol] = useState<Player>(initial.p1Symbol)

  return (
    <section className="relative flex flex-1 flex-col gap-8">
      {onOpenSettings && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={onOpenSettings}
          className="absolute right-0 top-2 size-11 rounded-full text-muted-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </Button>
      )}
      <header className="flex flex-col items-center pt-8 text-center">
        {/* A three-tile motif stands in for an app icon: the product is the board. */}
        <div aria-hidden="true" className="mb-6 grid grid-cols-3 gap-1.5">
          <span className="flex size-11 items-center justify-center rounded-[22%] bg-player-x-soft text-player-x">
            <Mark player="X" weight={15} className="size-6" />
          </span>
          <span className="flex size-11 items-center justify-center rounded-[22%] bg-player-o-soft text-player-o">
            <Mark player="O" weight={15} className="size-6" />
          </span>
          <span className="flex size-11 items-center justify-center rounded-[22%] bg-player-x-soft text-player-x">
            <Mark player="X" weight={15} className="size-6" />
          </span>
        </div>
        <h1 className="font-heading text-[2.6rem] font-semibold leading-none tracking-[-0.01em]">Tic-Tac-Toe</h1>
        <p className="mt-2 text-muted-foreground">Win three.</p>
      </header>

      <div className="flex flex-col gap-7">
        <Field label="Mode" hint="Who's playing?">
          <ToggleGroup
            value={[mode]}
            onValueChange={(v: string[]) => {
              const next = v[0]
              if (next) {
                setMode(next as Mode)
                onModeChange?.(next as Mode)
              }
            }}
            spacing={0}
            className="grid w-full grid-cols-3 gap-1 rounded-[18px] bg-muted p-1 dark:bg-muted/60"
            aria-label="Game mode"
          >
            <ToggleGroupItem value="pvp" className={segmentItem} aria-label="Two player" onClick={() => onKnock?.('mode:pvp')}>
              Two player
            </ToggleGroupItem>
            <ToggleGroupItem value="bot" className={segmentItem} aria-label="Versus bot" onClick={() => onKnock?.('mode:bot')}>
              Versus bot
            </ToggleGroupItem>
            <ToggleGroupItem
              value="online"
              className={cn(segmentItem, 'flex-col gap-0 leading-tight')}
              aria-label="Online"
              disabled={!online.available}
            >
              Online
              {!online.available && <span className="text-[11px] font-normal text-muted-foreground">Not set up</span>}
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        {mode === 'bot' && (
          <Field
            label={dev ? devDifficultyLabel(dev.rung, difficulty) : 'Difficulty'}
            hint={SETUP_HINTS[tone][difficulty]}
            className="rise-in"
          >
            <ToggleGroup
              value={[difficulty]}
              onValueChange={(v: string[]) => {
                const next = v[0]
                if (next) setDifficulty(next as Difficulty)
              }}
              spacing={0}
              className="grid w-full grid-cols-3 gap-1 rounded-[18px] bg-muted p-1 dark:bg-muted/60"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((d) => (
                <ToggleGroupItem key={d.value} value={d.value} className={segmentItem} aria-label={d.label}>
                  {d.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        )}

        {mode === 'bot' && (
          <Field label="You play" hint="X moves first" className="rise-in">
            <ToggleGroup
              value={[symbol]}
              onValueChange={(v: string[]) => {
                const next = v[0]
                if (next) setSymbol(next as Player)
              }}
              spacing={0}
              className="grid w-full grid-cols-2 gap-1 rounded-[18px] bg-muted p-1 dark:bg-muted/60"
              aria-label="Your symbol"
            >
              {(['X', 'O'] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} className={segmentItem} aria-label={`Play as ${p}`}>
                  <Mark
                    player={p}
                    weight={15}
                    className={cn('size-5', p === 'X' ? 'text-player-x' : 'text-player-o')}
                  />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        )}
        {mode === 'online' && online.panel}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {mode !== 'online' && (
          <Button
            size="lg"
            className="min-h-14 w-full rounded-[18px] text-base font-medium"
            onClick={() => {
              onKnock?.('start')
              onStart({ mode, difficulty, p1Symbol: mode === 'bot' ? symbol : 'X' })
            }}
          >
            Start game
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="min-h-14 w-full rounded-[18px] text-base font-medium"
          onClick={() => {
            onKnock?.('history:open')
            onOpenHistory()
          }}
        >
          History
        </Button>
        {install && <InstallCard offer={install} />}
      </div>
    </section>
  )
}

function InstallCard({ offer }: { offer: InstallOffer }) {
  return (
    <div className="rise-in mt-1 flex flex-col gap-3 rounded-[18px] bg-muted/70 p-4 dark:bg-muted/50">
      <div className="flex flex-col gap-1">
        <span className="font-heading text-[15px] font-medium">Add to Home Screen</span>
        <span className="text-sm text-muted-foreground">
          {offer.kind === 'prompt'
            ? 'Opens full screen like an app and works offline.'
            : 'Tap Share, then add it to your Home Screen. It opens full screen and works offline.'}
        </span>
      </div>
      <div className="flex gap-2">
        {offer.kind === 'prompt' && (
          <Button className="min-h-11 flex-1 rounded-[14px] text-[15px] font-medium" onClick={offer.onInstall}>
            Install
          </Button>
        )}
        <Button
          variant="ghost"
          className={cn('min-h-11 rounded-[14px] text-[15px]', offer.kind === 'prompt' ? 'px-4' : 'flex-1')}
          onClick={offer.onDismiss}
        >
          Not now
        </Button>
      </div>
    </div>
  )
}
