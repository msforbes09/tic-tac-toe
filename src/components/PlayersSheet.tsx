import { useEffect, useState } from 'react'
import { FloatingBack } from './FloatingBack'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { lastSeenLabel } from '@/lib/lastSeen'
import type { PlayerSeen, RoomDirectory } from '@/lib/roomDirectory'

export type PlayersSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** False while the device has no connection. */
  connected: boolean
  /** Unset when online play is not configured. */
  cloud?: { deviceId: string; directory: RoomDirectory }
}

const seenFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

type List = { players: PlayerSeen[]; next: string | null } | 'loading' | 'failed'

/** Developer mode only: every player row, most recently seen first, a page at a time. */
export function PlayersSheet({ open, onOpenChange, connected, cloud }: PlayersSheetProps) {
  const [list, setList] = useState<List>('loading')
  const [more, setMore] = useState(false)
  const directory = cloud?.directory
  const deviceId = cloud?.deviceId

  // One load per opening; no live updates.
  useEffect(() => {
    if (!open || !directory || !connected) return
    let cancelled = false
    setList('loading')
    directory
      .listPlayers()
      .then((page) => !cancelled && setList(page))
      .catch(() => !cancelled && setList('failed'))
    return () => {
      cancelled = true
    }
  }, [open, directory, connected])

  const showMore = async () => {
    if (!directory || typeof list !== 'object' || !list.next) return
    setMore(true)
    try {
      const page = await directory.listPlayers(list.next)
      setList({ players: [...list.players, ...page.players], next: page.next })
    } catch {
      // Leave the list as it is; Show more stays for another try.
    } finally {
      setMore(false)
    }
  }

  const now = Date.now()
  const note = (text: string) => <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        initialFocus={(openType) => openType === 'keyboard'}
        className="mx-auto flex w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        // Inline height, as in History: a definite height lets the list scroll.
        style={{ height: '85dvh', paddingBottom: 'max(4.5rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-heading text-2xl font-semibold">Players</SheetTitle>
          <SheetDescription>
            {typeof list === 'object' && connected && cloud
              ? `${list.players.length}${list.next ? '+' : ''} ${list.players.length === 1 && !list.next ? 'player' : 'players'}`
              : 'Every device with a nickname'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="-mx-5 min-h-0 flex-1 px-5">
          <div className="flex flex-col gap-3 pb-2 pt-1">
            {!cloud ? (
              note('Online play is not set up')
            ) : !connected ? (
              note('Offline')
            ) : list === 'loading' ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : list === 'failed' ? (
              note("Couldn't load players")
            ) : list.players.length === 0 ? (
              note('No players yet')
            ) : (
              <>
                <ul className="divide-y divide-border/70">
                  {list.players.map((p) => (
                    <li key={p.id} data-testid="player-row" className="flex min-h-16 items-center gap-3.5 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-[15px] font-semibold">{p.nickname}</span>
                        {p.id === deviceId && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">you</span>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end text-sm text-muted-foreground">
                        <span>{lastSeenLabel(p.lastSeenAt, now)}</span>
                        <span data-testid="seen-at" className="text-xs">
                          {seenFormat.format(p.lastSeenAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {list.next && (
                  <Button variant="ghost" className="min-h-11 w-full rounded-[14px] text-[15px] font-medium" disabled={more} onClick={showMore}>
                    Show more
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <FloatingBack />
      </SheetContent>
    </Sheet>
  )
}
