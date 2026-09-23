import { useEffect, useState } from 'react'
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

export type HistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: HistoryStorage
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

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
      <SheetContent side="bottom" className="mx-auto flex h-[85dvh] w-full max-w-[420px] flex-col rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>History</SheetTitle>
          <SheetDescription>Your last {entries.length === 1 ? 'game' : `${entries.length} games`}</SheetDescription>
        </SheetHeader>

        {entries.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-muted-foreground">No games yet</p>
        ) : (
          <ScrollArea className="flex-1 -mx-4 px-4">
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="flex min-h-14 items-center justify-between gap-3 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{outcomeLabel(e)}</span>
                    <span className="text-sm text-muted-foreground">{modeLabel(e)}</span>
                  </div>
                  <time dateTime={new Date(e.timestamp).toISOString()} className="text-sm text-muted-foreground">
                    {dateFormat.format(e.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {entries.length > 0 && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger render={<Button variant="outline" className="min-h-11 w-full" />}>
              Clear history
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl">
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
