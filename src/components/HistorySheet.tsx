import { useEffect, useState } from 'react'
import { ClimbGraph } from './ClimbGraph'
import { FloatingBack } from './FloatingBack'
import { Mark } from './Mark'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { climbSeries } from '@/lib/climb'
import { botStats, loadHistory, winnerSeat, type GameRow, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import type { KnockEvent } from '@/lib/knock'
import type { SeriesResult } from '@/lib/room'
import type { RoomDirectory } from '@/lib/roomDirectory'
import type { Difficulty, Mode } from '@/lib/types'
import { cn } from '@/lib/utils'

export type HistorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  storage: HistoryStorage
  /** The mode selected on setup; the sheet shows that mode's history. */
  mode: Mode
  /** When set, two-player and bot rows come from the cloud (local list as fallback). */
  cloud?: { deviceId: string; directory: RoomDirectory }
  /** When set, the Online section lists this player's series from the directory. */
  online?: { deviceId: string; directory: RoomDirectory }
  /** Reports the Back tap, one step of the developer knock. */
  onKnock?: (event: KnockEvent) => void
}

const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

/** Games shown per page; View more reveals another page. */
export const PAGE_SIZE = 10
/** How many rows the cloud is asked for: enough for the record table to be a lifetime record for anyone realistic. */
export const CLOUD_LIMIT = 500

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

/** Cloud rows and local entries meet here: a game from Player 1's side. */
type Shown = {
  id: string
  at: number
  difficulty: Difficulty | null
  rung: number | null
  outcome: 'won' | 'lost' | 'draw'
  symbol: 'X' | 'O'
}

const fromEntry = (e: HistoryEntry): Shown => {
  const seat = winnerSeat(e)
  return {
    id: e.id,
    at: e.timestamp,
    difficulty: e.difficulty,
    rung: e.rung ?? null,
    outcome: seat === null ? 'draw' : seat === 'p1' ? 'won' : 'lost',
    symbol: e.p1Symbol ?? 'X',
  }
}
const fromRow = (g: GameRow): Shown => ({
  id: g.id,
  at: g.playedAt,
  difficulty: g.difficulty,
  rung: g.rung,
  outcome: g.outcome,
  symbol: g.symbol,
})

/** botStats works on entries; rebuild the minimum it needs from what is shown. */
const asEntries = (games: Shown[]): HistoryEntry[] =>
  games.map((g) => ({
    id: g.id,
    timestamp: g.at,
    mode: 'bot' as const,
    difficulty: g.difficulty,
    outcome: g.outcome === 'draw' ? 'draw' : g.outcome === 'won' ? g.symbol : g.symbol === 'X' ? 'O' : 'X',
    p1Symbol: g.symbol,
  }))

function BotRecordTable({ games }: { games: Shown[] }) {
  const stats = botStats(asEntries(games))
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

function PvpTally({ games }: { games: Shown[] }) {
  const p1 = games.filter((g) => g.outcome === 'won').length
  const p2 = games.filter((g) => g.outcome === 'lost').length
  const draws = games.length - p1 - p2
  return (
    <table aria-label="Two-player tally" className="w-full text-sm tabular-nums">
      <tbody>
        {[
          ['Player 1', p1],
          ['Player 2', p2],
          ['Draws', draws],
        ].map(([label, n]) => (
          <tr key={label}>
            <th scope="row" className="py-0.5 text-left font-medium">
              {label}
            </th>
            <td className="py-0.5 text-right">{n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function safeLoad(storage: HistoryStorage, mode: Mode): HistoryEntry[] {
  try {
    return loadHistory(storage).filter((e) => e.mode === mode)
  } catch {
    return []
  }
}

function OutcomeBadge({ symbol, outcome }: { symbol: 'X' | 'O'; outcome: Shown['outcome'] }) {
  if (outcome === 'draw') {
    return (
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[28%] bg-muted text-muted-foreground">
        <span className="h-[3px] w-4 rounded-full bg-current" />
      </span>
    )
  }
  const winner: 'X' | 'O' = outcome === 'won' ? symbol : symbol === 'X' ? 'O' : 'X'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-[28%]',
        winner === 'X' ? 'bg-player-x-soft text-player-x' : 'bg-player-o-soft text-player-o',
      )}
    >
      <Mark player={winner} weight={15} className="size-5" />
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

/** One series from my side: who I played, whether I won, the score, and how it ended. */
function seriesLine(r: SeriesResult, me: string): { title: string; score: string; tag: string | null } {
  const won = r.winner.deviceId === me
  const other = won ? r.loser : r.winner
  const title = won ? `You beat ${other.nickname}` : `You lost to ${other.nickname}`
  const score = won ? `${r.winnerScore}–${r.loserScore}` : `${r.loserScore}–${r.winnerScore}`
  const tag = r.reason === 'resigned' ? `${r.loser.nickname} resigned` : r.reason === 'left' ? `${r.loser.nickname} left` : null
  return { title, score, tag }
}

const TITLE: Record<Mode, string> = { pvp: 'Two-player history', bot: 'Bot history', online: 'Online history' }

export function HistorySheet({ open, onOpenChange, storage, mode, cloud, online, onKnock }: HistorySheetProps) {
  const [games, setGames] = useState<Shown[]>([])
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [series, setSeries] = useState<SeriesResult[] | null>(null)

  // Two-player and bot games: the local list right away, then the cloud rows merged in by id so a
  // game that has not been pushed yet (just finished, or played offline) never disappears.
  const cloudId = cloud?.deviceId
  const cloudDir = cloud?.directory
  useEffect(() => {
    if (!open) return
    const local = safeLoad(storage, mode).map(fromEntry)
    setGames(local)
    setVisible(PAGE_SIZE)
    if (mode === 'online' || !cloudId || !cloudDir) return
    let live = true
    cloudDir
      .listGames(cloudId, mode, CLOUD_LIMIT)
      .then((rows) => {
        if (!live) return
        const byId = new Map(local.map((g) => [g.id, g]))
        for (const row of rows) byId.set(row.id, fromRow(row))
        setGames([...byId.values()].sort((a, b) => b.at - a.at))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [open, storage, mode, cloudId, cloudDir])

  const deviceId = online?.deviceId
  const directory = online?.directory
  useEffect(() => {
    if (!open || mode !== 'online' || !deviceId || !directory) return
    return directory.onMyResultsChange(deviceId, setSeries)
  }, [open, mode, deviceId, directory])

  const climb = mode === 'bot' ? climbSeries(games) : []
  const outcomeLabel = (g: Shown) =>
    g.outcome === 'draw' ? 'Draw' : mode === 'pvp' ? (g.outcome === 'won' ? 'Player 1 won' : 'Player 2 won') : g.outcome === 'won' ? 'You won' : 'You lost'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        // A tap moves no focus (the default would focus a button deep in the list and scroll to it);
        // keyboard users keep the default.
        initialFocus={(openType) => openType === 'keyboard'}
        className="mx-auto flex w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        // Inline height: the sheet's own `data-[side=bottom]:h-auto` would beat a class, and without a
        // definite height the list's scroll area grows with its content instead of scrolling.
        style={{ height: '85dvh', paddingBottom: 'max(4.5rem, env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="font-heading text-2xl font-semibold">{TITLE[mode]}</SheetTitle>
          <SheetDescription>
            {mode === 'online' ? 'Series you played, from every room' : mode === 'bot' ? 'Your games against the bot' : 'Games shared on this phone'}
          </SheetDescription>
        </SheetHeader>

        {/* min-h-0 lets the scroll area shrink inside the flex column instead of growing with its content. */}
        <ScrollArea className="-mx-5 min-h-0 flex-1 px-5">
          <div className="flex flex-col gap-3 pb-2 pt-1">
            {mode === 'online' &&
              (!online ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Online play is not set up</p>
              ) : series === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : series.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No series yet</p>
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
              ))}

            {mode !== 'online' && (
              <>
                {mode === 'bot' && climb.length >= 2 ? (
                  // The climb and the record side by side, one swipe apart.
                  <div
                    role="group"
                    aria-label="Climb and record"
                    className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    <ClimbGraph rungs={climb} className="w-full shrink-0 snap-center" />
                    <div className="w-full shrink-0 snap-center rounded-[18px] bg-muted/70 px-4 py-2.5 dark:bg-muted/50">
                      <BotRecordTable games={games} />
                    </div>
                  </div>
                ) : (
                  games.length > 0 && (
                    <div className="rounded-[18px] bg-muted/70 px-4 py-2.5 dark:bg-muted/50">
                      {mode === 'bot' ? <BotRecordTable games={games} /> : <PvpTally games={games} />}
                    </div>
                  )
                )}
                {games.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{mode === 'bot' ? 'No bot games yet' : 'No two-player games yet'}</p>
                ) : (
                  <>
                    <ul className="divide-y divide-border/70">
                      {games.slice(0, visible).map((g) => (
                        <li key={g.id} className="flex min-h-16 items-center gap-3.5 py-3">
                          <OutcomeBadge symbol={g.symbol} outcome={g.outcome} />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[15px] font-semibold">{outcomeLabel(g)}</span>
                            <span className="text-sm text-muted-foreground">
                              {mode === 'bot' ? DIFFICULTY_LABEL[g.difficulty ?? 'medium'] : 'Same phone'}
                            </span>
                          </div>
                          <When at={g.at} />
                        </li>
                      ))}
                    </ul>
                    {games.length > visible && (
                      <Button variant="ghost" className="min-h-11 w-full rounded-[14px] text-[15px] font-medium" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                        View more
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <FloatingBack onClick={() => onKnock?.('history:back')} />
      </SheetContent>
    </Sheet>
  )
}
