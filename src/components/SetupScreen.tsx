import { useState, type ReactNode } from 'react'
import { Mark } from './Mark'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { normalizeRoomCode } from '@/lib/room'
import { cn } from '@/lib/utils'
import { DEFAULT_SETTINGS } from '@/lib/setup'
import type { Difficulty, Mode, Player, Settings } from '@/lib/types'

export type OnlineSetup = { available: boolean; onCreate: () => void; onJoin: (code: string) => void }

/** The install nudge: a one-tap prompt where the browser offers one, manual steps on iPhone. */
export type InstallOffer = { kind: 'prompt' | 'ios-steps'; onInstall: () => void; onDismiss: () => void }

const NO_ONLINE: OnlineSetup = { available: false, onCreate() {}, onJoin() {} }

export type SetupScreenProps = {
  /** Preselected choices, e.g. the last setup played. */
  initial?: Settings
  onStart: (settings: Settings) => void
  onOpenHistory: () => void
  /** Online play, when Supabase is configured. */
  online?: OnlineSetup
  /** Shown when the app can be added to the home screen and has not been dismissed lately. */
  install?: InstallOffer
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

export function SetupScreen({
  initial = DEFAULT_SETTINGS,
  onStart,
  onOpenHistory,
  online = NO_ONLINE,
  install,
}: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>(initial.mode === 'online' && !online.available ? 'pvp' : initial.mode)
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const [symbol, setSymbol] = useState<Player>(initial.p1Symbol)
  const [codeInput, setCodeInput] = useState('')
  const joinCode = normalizeRoomCode(codeInput)
  const join = () => {
    if (joinCode) online.onJoin(joinCode)
  }

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
            className="grid w-full grid-cols-3 gap-1 rounded-[18px] bg-muted p-1 dark:bg-muted/60"
            aria-label="Game mode"
          >
            <ToggleGroupItem value="pvp" className={segmentItem} aria-label="Two player">
              Two player
            </ToggleGroupItem>
            <ToggleGroupItem value="bot" className={segmentItem} aria-label="Versus bot">
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
        {mode === 'online' && (
          <Field label="Room" hint="Play a friend on their phone" className="rise-in">
            <Button
              size="lg"
              className="min-h-14 w-full rounded-[18px] text-base font-semibold"
              onClick={online.onCreate}
            >
              Create room
            </Button>
            <div className="flex gap-2">
              <input
                aria-label="Room code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') join()
                }}
                placeholder="Code"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={8}
                inputMode="text"
                className="min-h-14 min-w-0 flex-1 rounded-[18px] border border-input bg-background px-4 text-center text-xl font-semibold uppercase tracking-[0.3em] outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="lg"
                variant="outline"
                className="min-h-14 rounded-[18px] px-6 text-base font-semibold"
                disabled={!joinCode}
                onClick={join}
              >
                Join
              </Button>
            </div>
          </Field>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {mode !== 'online' && (
          <Button
            size="lg"
            className="min-h-14 w-full rounded-[18px] text-base font-semibold"
            onClick={() => onStart({ mode, difficulty, p1Symbol: mode === 'bot' ? symbol : 'X' })}
          >
            Start game
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="min-h-14 w-full rounded-[18px] text-base font-medium"
          onClick={onOpenHistory}
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
        <span className="text-[15px] font-semibold">Add to Home Screen</span>
        <span className="text-sm text-muted-foreground">
          {offer.kind === 'prompt'
            ? 'Opens full screen like an app and works offline.'
            : 'Tap Share, then add it to your Home Screen. It opens full screen and works offline.'}
        </span>
      </div>
      <div className="flex gap-2">
        {offer.kind === 'prompt' && (
          <Button className="min-h-11 flex-1 rounded-[14px] text-[15px] font-semibold" onClick={offer.onInstall}>
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
