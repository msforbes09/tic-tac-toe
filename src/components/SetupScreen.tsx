import { useState, type ReactNode } from 'react'
import { Mark } from './Mark'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { DEFAULT_SETTINGS } from '@/lib/setup'
import type { Difficulty, Mode, Player, Settings } from '@/lib/types'

export type SetupScreenProps = {
  /** Preselected choices, e.g. the last setup played. */
  initial?: Settings
  onStart: (settings: Settings) => void
  onOpenHistory: () => void
}

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Plays at random' },
  { value: 'medium', label: 'Medium', hint: 'Takes wins and blocks' },
  { value: 'hard', label: 'Hard', hint: 'Never loses' },
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
        <span className="text-base font-semibold">{label}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  )
}

export function SetupScreen({ initial = DEFAULT_SETTINGS, onStart, onOpenHistory }: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const [symbol, setSymbol] = useState<Player>(initial.p1Symbol)

  return (
    <section className="flex flex-1 flex-col gap-8">
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
        <h1 className="text-[2.5rem] font-bold leading-none tracking-[-0.03em]">Tic-Tac-Toe</h1>
        <p className="mt-2 text-muted-foreground">Three in a row wins.</p>
      </header>

      <div className="flex flex-col gap-7">
        <Field label="Mode" hint="Who's playing?">
          <ToggleGroup
            value={[mode]}
            onValueChange={(v: string[]) => {
              const next = v[0]
              if (next) setMode(next as Mode)
            }}
            spacing={0}
            className="grid w-full grid-cols-2 gap-1 rounded-[18px] bg-muted p-1 dark:bg-muted/60"
            aria-label="Game mode"
          >
            <ToggleGroupItem value="pvp" className={segmentItem} aria-label="Two player">
              Two player
            </ToggleGroupItem>
            <ToggleGroupItem value="bot" className={segmentItem} aria-label="Versus bot">
              Versus bot
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        {mode === 'bot' && (
          <Field
            label="Difficulty"
            hint={DIFFICULTIES.find((d) => d.value === difficulty)?.hint ?? ''}
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
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <Button
          size="lg"
          className="min-h-14 w-full rounded-[18px] text-base font-semibold"
          onClick={() => onStart({ mode, difficulty, p1Symbol: mode === 'bot' ? symbol : 'X' })}
        >
          Start game
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="min-h-14 w-full rounded-[18px] text-base font-medium"
          onClick={onOpenHistory}
        >
          History
        </Button>
      </div>
    </section>
  )
}
