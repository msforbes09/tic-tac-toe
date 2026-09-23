import { useEffect, useState } from 'react'
import { Mark } from './Mark'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { clearHistory, loadHistory, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import { cn } from '@/lib/utils'

export type HistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: HistoryStorage
}

const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

function outcomeLabel(e: HistoryEntry): string {
  if (e.outcome === 'draw') return 'Draw'
  if (e.mode === 'pvp') return `${e.outcome} wins`
  return e.outcome === 'X' ? 'You win' : 'Bot wins'
}

function modeLabel(e: HistoryEntry): string {
  if (e.mode === 'pvp') return 'Two player'
  const d = e.difficulty ?? 'medium'
  return `Bot · ${d.charAt(0).toUpperCase()}${d.slice(1)}`
}

function safeLoad(storage: HistoryStorage): HistoryEntry[] {
  try {
    return loadHistory(storage)
  } catch {
    return []
  }
}

function OutcomeBadge({ outcome }: { outcome: HistoryEntry['outcome'] }) {
  if (outcome === 'draw') {
    return (
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[28%] bg-muted text-muted-foreground"
      >
        <span className="h-[3px] w-4 rounded-full bg-current" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-[28%]',
        outcome === 'X' ? 'bg-player-x-soft text-player-x' : 'bg-player-o-soft text-player-o',
      )}
    >
      <Mark player={outcome} weight={15} className="size-5" />
    </span>
  )
}

export function HistorySheet({ open, onOpenChange, storage }: HistorySheetProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) setEntries(safeLoad(storage))
  }, [open, storage])

  const handleClear = () => {
    try {
      clearHistory(storage)
    } catch {
      // best-effort
    }
    setEntries([])
    setConfirmOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[85dvh] w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="text-2xl font-bold tracking-tight">History</SheetTitle>
          <SheetDescription>
            {entries.length === 0
              ? 'Finished games show up here'
              : `Your last ${entries.length === 1 ? 'game' : `${entries.length} games`}`}
          </SheetDescription>
        </SheetHeader>

        {entries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div aria-hidden="true" className="grid grid-cols-3 gap-1 opacity-60">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="size-5 rounded-[26%] bg-muted" />
              ))}
            </div>
            <p className="text-muted-foreground">No games yet</p>
          </div>
        ) : (
          <ScrollArea className="-mx-5 flex-1 px-5">
            <ul className="divide-y divide-border/70">
              {entries.map((e) => (
                <li key={e.id} className="flex min-h-16 items-center gap-3.5 py-3">
                  <OutcomeBadge outcome={e.outcome} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{outcomeLabel(e)}</span>
                    <span className="text-sm text-muted-foreground">{modeLabel(e)}</span>
                  </div>
                  <time
                    dateTime={new Date(e.timestamp).toISOString()}
                    className="flex shrink-0 flex-col items-end text-sm tabular-nums text-muted-foreground"
                  >
                    <span>{dayFormat.format(e.timestamp)}</span>
                    <span className="text-xs">{timeFormat.format(e.timestamp)}</span>
                  </time>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {entries.length > 0 && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger
              render={<Button variant="outline" className="mt-2 min-h-12 w-full rounded-[16px] text-base" />}
            >
              Clear history
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all games?</AlertDialogTitle>
                <AlertDialogDescription>This removes every entry from your history. It can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
                <AlertDialogAction className="min-h-11" onClick={handleClear}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </SheetContent>
    </Sheet>
  )
}
