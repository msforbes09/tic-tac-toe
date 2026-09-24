import { useEffect, useState } from 'react'
import { Mark } from './Mark'
import { TOP_SHARE_TEXT } from './TopCard'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { botStats, loadHistory, winnerSeat, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import type { KnockEvent } from '@/lib/knock'
import { loadLadder, type Ladder } from '@/lib/ladder'
import type { SeriesResult } from '@/lib/room'
import type { RoomDirectory } from '@/lib/roomDirectory'
import type { Difficulty } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { ShareLink } from '@/platform/share'

export type HistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: HistoryStorage
  /** When set, an Online section lists this player's series from the directory. */
  online?: { deviceId: string; directory: RoomDirectory }
  /** For bragging from the top-of-the-pack badge. */
  share?: ShareLink
  siteUrl?: string
  /** Reports the Back tap, one step of the developer knock. */
  onKnock?: (event: KnockEvent) => void
}

const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

/** Games shown per page; View more reveals another page. */
export const PAGE_SIZE = 10

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function botOutcome(e: HistoryEntry): string {
  const seat = winnerSeat(e)
  if (seat === null) return 'Draw'
  return seat === 'p1' ? 'You won' : 'You lost'
}

function BotRecordTable({ entries }: { entries: HistoryEntry[] }) {
  const stats = botStats(entries)
  return (
    <table aria-label="Record against the bot" className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th scope="col" className="py-1 text-left font-medium">
            <span className="sr-only">Difficulty</span>
          </th>
          <th scope="col" className="py-1 text-right font-medium">Won</th>
          <th scope="col" className="py-1 text-right font-medium">Lost</th>
          <th scope="col" className="py-1 text-right font-medium">Drawn</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(stats) as Difficulty[]).map((d) => (
          <tr key={d}>
            <th scope="row" className="py-0.5 text-left font-medium">
              {DIFFICULTY_LABEL[d]}
            </th>
            <td className="py-0.5 text-right">{stats[d].wins}</td>
            <td className="py-0.5 text-right">{stats[d].losses}</td>
            <td className="py-0.5 text-right">{stats[d].draws}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Local history holds bot games only now; older two-player and online rows are ignored. */
function safeLoad(storage: HistoryStorage): HistoryEntry[] {
  try {
    return loadHistory(storage).filter((e) => e.mode === 'bot')
  } catch {
    return []
  }
}

/** The badge for holding rung 30 to a draw. Shown only once that has happened. */
function TopBadge({ ladder, share, siteUrl }: { ladder: Ladder; share?: ShareLink; siteUrl?: string }) {
  if (ladder.topHeldAt === null) return null
  const times = ladder.topHeldCount === 1 ? 'Held once' : `Held ${ladder.topHeldCount} times`
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-player-o-soft px-4 py-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-player-o/20 text-player-o">
        <Mark player="O" weight={15} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-heading text-[15px] font-medium">Top of the pack</span>
        <span className="text-sm text-muted-foreground">
          {times} · since {dayFormat.format(ladder.topHeldAt)}
        </span>
      </div>
      {share && siteUrl && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 rounded-xl px-3 text-[14px]"
          onClick={() => void share(siteUrl, TOP_SHARE_TEXT)}
        >
          Share
        </Button>
      )}
    </div>
  )
}

function OutcomeBadge({ outcome }: { outcome: HistoryEntry['outcome'] }) {
  if (outcome === 'draw') {
    return (
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[28%] bg-muted text-muted-foreground">
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

function When({ at }: { at: number }) {
  return (
    <time dateTime={new Date(at).toISOString()} className="flex shrink-0 flex-col items-end text-sm tabular-nums text-muted-foreground">
      <span>{dayFormat.format(at)}</span>
      <span className="text-xs">{timeFormat.format(at)}</span>
    </time>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="font-heading pt-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{children}</h3>
}

/** One series from my side: who I played, whether I won, the score, and how it ended. */
function seriesLine(r: SeriesResult, me: string): { title: string; score: string; tag: string | null } {
  const won = r.winner.deviceId === me
  const other = won ? r.loser : r.winner
  const title = won ? `You beat ${other.nickname}` : `You lost to ${other.nickname}`
  const score = won ? `${r.winnerScore}–${r.loserScore}` : `${r.loserScore}–${r.winnerScore}`
  const tag = r.reason === 'resigned' ? `${r.loser.nickname} resigned` : r.reason === 'left' ? `${r.loser.nickname} left` : null
  return { title, score, tag }
}

export function HistorySheet({ open, onOpenChange, storage, online, share, siteUrl, onKnock }: HistorySheetProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [ladder, setLadder] = useState<Ladder | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [series, setSeries] = useState<SeriesResult[] | null>(null)

  useEffect(() => {
    if (!open) return
    setEntries(safeLoad(storage))
    setLadder(loadLadder(storage))
    setVisible(PAGE_SIZE)
  }, [open, storage])

  const deviceId = online?.deviceId
  const directory = online?.directory
  useEffect(() => {
    if (!open || !deviceId || !directory) return
    return directory.onMyResultsChange(deviceId, setSeries)
  }, [open, deviceId, directory])

  const total = entries.length + (series?.length ?? 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        // Inline height: the sheet's own `data-[side=bottom]:h-auto` would beat a class, and without a
        // definite height the list's scroll area grows with its content instead of scrolling.
        style={{ height: '85dvh', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-heading text-2xl font-semibold">History</SheetTitle>
          <SheetDescription>{total === 0 ? 'Finished games show up here' : 'Bot games on this phone, series from online play'}</SheetDescription>
        </SheetHeader>

        {/* min-h-0 lets the scroll area shrink inside the flex column instead of growing with its content. */}
        <ScrollArea className="-mx-5 min-h-0 flex-1 px-5">
          <div className="flex flex-col gap-3 pb-2">
            {online && (
              <section className="flex flex-col gap-2">
                <SectionTitle>Online</SectionTitle>
                {series === null ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : series.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No series yet</p>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {series.map((r) => {
                      const { title, score, tag } = seriesLine(r, deviceId!)
                      const won = r.winner.deviceId === deviceId
                      return (
                        <li key={r.gameId} data-testid="series-row" className="flex min-h-16 items-center gap-3.5 py-3">
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-[28%] text-sm font-semibold tabular-nums',
                              won ? 'bg-player-x-soft text-player-x' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {score}
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[15px] font-semibold">{title}</span>
                            <span className="text-sm text-muted-foreground">{tag ?? `${r.games} games`}</span>
                          </div>
                          <When at={r.endedAt} />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )}

            <section className="flex flex-col gap-2">
              <SectionTitle>Bot</SectionTitle>
              {ladder && <TopBadge ladder={ladder} share={share} siteUrl={siteUrl} />}
              {entries.length > 0 && (
                <div className="rounded-[18px] bg-muted/70 px-4 py-2.5 dark:bg-muted/50">
                  <BotRecordTable entries={entries} />
                </div>
              )}
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bot games yet</p>
              ) : (
                <>
                  <ul className="divide-y divide-border/70">
                    {entries.slice(0, visible).map((e) => (
                      <li key={e.id} className="flex min-h-16 items-center gap-3.5 py-3">
                        <OutcomeBadge outcome={e.outcome} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-semibold">{botOutcome(e)}</span>
                          <span className="text-sm text-muted-foreground">{DIFFICULTY_LABEL[e.difficulty ?? 'medium']}</span>
                        </div>
                        <When at={e.timestamp} />
                      </li>
                    ))}
                  </ul>
                  {entries.length > visible && (
                    <Button variant="ghost" className="min-h-11 w-full rounded-[14px] text-[15px] font-medium" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                      View more
                    </Button>
                  )}
                </>
              )}
            </section>
          </div>
        </ScrollArea>

        <SheetClose
          render={
            <Button className="mt-2 min-h-12 w-full rounded-[16px] text-base font-medium" onClick={() => onKnock?.('history:back')} />
          }
        >
          Back
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}
