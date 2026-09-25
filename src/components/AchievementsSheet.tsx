import { useState } from 'react'
import { AchievementIcon } from './AchievementBadge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ACHIEVEMENTS, SHOW_HIDDEN_KEY, TIER_COLOR, TIER_ORDER, type Achievement, type AchievementState, type Tier } from '@/lib/achievements'
import type { HistoryStorage } from '@/lib/history'
import { cn } from '@/lib/utils'

export type AchievementsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: AchievementState
  /** Remembers the Show hidden switch. */
  storage: HistoryStorage
}

const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const TIER_LABEL: Record<Tier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }

const readShowHidden = (storage: HistoryStorage) => {
  try {
    return storage.getItem(SHOW_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

/** Every achievement, by tier: unlocked with a date, locked and visible, or locked and hidden (a "?"). */
export function AchievementsSheet({ open, onOpenChange, state, storage }: AchievementsSheetProps) {
  const [showHidden, setShowHidden] = useState(() => readShowHidden(storage))
  const toggleHidden = () => {
    const next = !showHidden
    setShowHidden(next)
    try {
      if (next) storage.setItem(SHOW_HIDDEN_KEY, '1')
      else storage.removeItem(SHOW_HIDDEN_KEY)
    } catch {
      // Best-effort.
    }
  }
  const unlocked = ACHIEVEMENTS.filter((a) => state.unlocks[a.id] !== undefined).length
  const ordered = [...ACHIEVEMENTS].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        initialFocus={(openType) => openType === 'keyboard'}
        className="mx-auto flex w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        style={{ height: '85dvh', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-heading text-2xl font-semibold">Achievements</SheetTitle>
          <SheetDescription>
            {unlocked} of {ACHIEVEMENTS.length} unlocked
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="-mx-5 min-h-0 flex-1 px-5">
          <div className="flex flex-col gap-3 pb-2 pt-1">
            <div className="grid grid-cols-4 gap-2">
              {TIER_ORDER.map((tier) => {
                const all = ACHIEVEMENTS.filter((a) => a.tier === tier)
                const got = all.filter((a) => state.unlocks[a.id] !== undefined).length
                return (
                  <span key={tier} aria-label={TIER_LABEL[tier]} className="flex flex-col items-center rounded-[14px] bg-muted/70 py-2 dark:bg-muted/50">
                    <span className="text-[15px] font-semibold tabular-nums" style={{ color: TIER_COLOR[tier] }}>
                      {got}/{all.length}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{TIER_LABEL[tier]}</span>
                  </span>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-4 px-1">
              <span id="achievements-show-hidden" className="text-sm text-muted-foreground">
                Show hidden
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showHidden}
                aria-labelledby="achievements-show-hidden"
                onClick={toggleHidden}
                className={cn(
                  'box-border flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-150',
                  showHidden ? 'justify-end bg-player-o' : 'justify-start bg-input',
                )}
              >
                <span aria-hidden="true" className="size-5 shrink-0 rounded-full bg-background" />
              </button>
            </div>

            <ul className="grid grid-cols-2 gap-3">
              {ordered.map((a) => (
                <Tile key={a.id} a={a} at={state.unlocks[a.id]} reveal={showHidden} />
              ))}
            </ul>
          </div>
        </ScrollArea>

        <SheetClose render={<Button className="mt-2 min-h-12 w-full rounded-[16px] text-base font-medium" />}>Back</SheetClose>
      </SheetContent>
    </Sheet>
  )
}

function Tile({ a, at, reveal }: { a: Achievement; at?: number; reveal: boolean }) {
  const unlocked = at !== undefined
  const secret = !unlocked && a.hidden && !reveal
  return (
    <li
      data-testid="achievement"
      data-unlocked={unlocked}
      className={cn('flex flex-col gap-1.5 rounded-[18px] bg-muted/70 px-3.5 py-3 dark:bg-muted/50', !unlocked && 'opacity-70')}
    >
      <span className="flex items-center justify-between">
        {secret ? (
          <span aria-hidden="true" className="text-xl font-semibold text-muted-foreground">
            ?
          </span>
        ) : (
          <AchievementIcon id={a.id} className={cn('size-6', !unlocked && 'text-muted-foreground')} dimmed={!unlocked} />
        )}
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: TIER_COLOR[a.tier] }} />
      </span>
      <span className="font-heading text-[14px] font-semibold">{secret ? 'Hidden' : a.name}</span>
      <span className="text-[12px] text-muted-foreground">{secret ? 'Unlock it to find out' : a.description}</span>
      {unlocked && <span className="text-[11px] text-muted-foreground">{dayFormat.format(at)}</span>}
      {!unlocked && a.hidden && reveal && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Hidden</span>}
    </li>
  )
}
