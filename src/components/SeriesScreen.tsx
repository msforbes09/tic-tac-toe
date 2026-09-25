import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Board } from './Board'
import { Celebration } from './Celebration'
import { Interstitial } from './Interstitial'
import { StatusBar } from './StatusBar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { feedbackForChange, type Feedback } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import type { Connection, OpenChannel } from '@/lib/realtime'
import { gameChannel, isGameMessage, isGamePresence, type GamePresence, type SeriesPlayer, type SeriesResult } from '@/lib/room'
import type { Board as BoardModel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { onlineReducer, resolveRole, type SeriesRole } from '@/state/online'
import { canSeatMove, seatOf, symbolOf } from '@/state/reducer'
import {
  GRACE_MS,
  SERIES_GAMES,
  isTieBreak,
  playerOf,
  seatOfSide,
  seriesPhase,
  seriesStatusText,
  sideOf,
  snapshotOfSeries,
  type SeriesSide,
  type SeriesState,
} from '@/state/series'

export type SeriesScreenProps = {
  self: SeriesPlayer
  /** The role this device starts with; it may promote itself if the referee drops. */
  role: SeriesRole
  initial: SeriesState
  open: OpenChannel
  storage: HistoryStorage
  feedback: Feedback
  /** Back to room: with the result once the series is over, null when a watcher leaves early. */
  onExit: (result: SeriesResult | null) => void
  /** Referee only, once, when the result appears. */
  onResult?: (result: SeriesResult) => void
  /** Referee only: persist the result. */
  addResult: (result: SeriesResult) => Promise<void>
  now?: () => number
}

const otherSide = (side: SeriesSide): SeriesSide => (side === 'challenger' ? 'challenged' : 'challenger')

function resultCopy(result: SeriesResult, self: string): { title: string; subtitle: string } {
  const score = `${result.winnerScore}–${result.loserScore}`
  const how = result.reason === 'resigned' ? `${result.loser.nickname} resigned` : result.reason === 'left' ? `${result.loser.nickname} left` : score
  const subtitle = result.reason === 'decided' ? `Final score ${score}` : `${how} · ${score}`
  if (self === result.winner.deviceId) return { title: 'You won the series', subtitle }
  if (self === result.loser.deviceId) return { title: 'You lost the series', subtitle }
  return { title: `${result.winner.nickname} wins the series`, subtitle }
}

/**
 * One series between two players, with everyone else watching. The referee's device holds the
 * truth and broadcasts it; players send requests; watchers only receive. Presence drives the
 * grace period and the referee handover.
 */
export function SeriesScreen({ self, role: initialRole, initial, open, feedback, onExit, onResult, addResult, now = Date.now }: SeriesScreenProps) {
  const [role, setRole] = useState<SeriesRole>(initialRole)
  const roleRef = useRef(role)
  roleRef.current = role
  const [state, dispatch] = useReducer(onlineReducer(role), initial)
  const latest = useRef(state)
  latest.current = state
  const [connection, setConnection] = useState<Connection<GamePresence> | null>(null)
  const [members, setMembers] = useState<GamePresence[]>([])
  const [confirmResign, setConfirmResign] = useState(false)
  const [tieShown, setTieShown] = useState(false)
  const [showTie, setShowTie] = useState(false)
  const previousBoard = useRef<BoardModel | null>(null)
  const resultHandled = useRef(false)
  // True once this device holds the referee's truth: referees always, others after their first snapshot.
  const synced = useRef(initialRole === 'referee')

  const mySide = sideOf(state, self.deviceId)
  const isPlayer = mySide !== null && role !== 'watcher'
  const opponent = mySide ? playerOf(state, otherSide(mySide)) : null
  const opponentPresent = opponent === null || members.some((m) => m.deviceId === opponent.deviceId)
  const phase = seriesPhase(state)
  const waiting = isPlayer && !opponentPresent && phase !== 'over'

  // Connect, track presence, and route messages by role.
  useEffect(() => {
    let cancelled = false
    let conn: Connection<GamePresence> | null = null
    let offMessage = () => {}
    let offPresence = () => {}
    void open<GamePresence>(gameChannel(initial.gameId), self.deviceId).then((c) => {
      if (cancelled) {
        c.leave()
        return
      }
      conn = c
      offPresence = c.onPresence((list) => setMembers(list.map((m) => m.meta).filter(isGamePresence)))
      offMessage = c.onMessage((raw) => {
        if (!isGameMessage(raw)) return
        if (raw.type === 'state') synced.current = true
        if (raw.type === 'hello') {
          if (roleRef.current === 'referee') c.send({ type: 'state', state: snapshotOfSeries(latest.current) })
          return
        }
        dispatch({ type: 'GAME_MESSAGE', message: raw })
      })
      c.track({ deviceId: self.deviceId, role: roleRef.current })
      setMembers(c.members().map((m) => m.meta).filter(isGamePresence))
      if (roleRef.current !== 'referee') c.send({ type: 'hello', from: self.deviceId })
      setConnection(c)
    })
    return () => {
      cancelled = true
      offMessage()
      offPresence()
      conn?.leave()
    }
  }, [open, initial.gameId, self.deviceId])

  // The referee shares its state after every change and whenever presence changes, so a device that
  // dropped and came back (or joined late) is brought up to date without asking.
  useEffect(() => {
    if (role === 'referee' && connection) connection.send({ type: 'state', state: snapshotOfSeries(state) })
  }, [role, connection, state, members])

  // Two referees after a reconnect: the lower id keeps it. A finished series never changes hands.
  useEffect(() => {
    if (state.result) return
    const resolved = resolveRole(self.deviceId, role, members)
    if (resolved !== role) {
      setRole(resolved)
      connection?.track({ deviceId: self.deviceId, role: resolved })
      if (resolved === 'player') connection?.send({ type: 'hello', from: self.deviceId })
    }
  }, [members, role, connection, self.deviceId, state.result])

  // Grace period: a missing opponent is resigned by the referee; a missing referee is replaced, and
  // the new referee then gives the missing player the same grace before resigning them.
  useEffect(() => {
    if (!isPlayer || !opponent || opponentPresent || phase === 'over' || !connection) return
    const id = setTimeout(() => {
      if (roleRef.current === 'referee') {
        dispatch({ type: 'RESIGN', by: opponent.deviceId, reason: 'left', at: now() })
      } else if (!synced.current) {
        // Never heard from a referee: there is no series to inherit. Back to the room.
        onExit(null)
      } else {
        setRole('referee')
        connection.track({ deviceId: self.deviceId, role: 'referee' })
      }
    }, GRACE_MS)
    return () => clearTimeout(id)
  }, [isPlayer, opponent, opponentPresent, phase, connection, self.deviceId, now, role, onExit])

  // Sound and haptics; the opponent's win sounds like a loss. Watchers just hear the moves.
  const opponentSymbol = isPlayer && mySide ? symbolOf(state.game, seatOfSide(otherSide(mySide))) : null
  useEffect(() => {
    const event = feedbackForChange(previousBoard.current, state.game.board, opponentSymbol)
    previousBoard.current = state.game.board
    if (event) feedback.play(event)
  }, [state.game.board, opponentSymbol, feedback])

  // The referee persists the result once and tells the room.
  useEffect(() => {
    if (!state.result || resultHandled.current || role !== 'referee') return
    resultHandled.current = true
    void addResult(state.result)
    onResult?.(state.result)
  }, [state.result, role, addResult, onResult])

  // Tie breaker splash when game 11 begins.
  useEffect(() => {
    if (isTieBreak(state) && !tieShown) {
      setTieShown(true)
      setShowTie(true)
    }
  }, [state, tieShown])
  const hideTie = useCallback(() => setShowTie(false), [])

  const send = (message: object) => connection?.send(message)
  const play = (index: number) => {
    if (role === 'referee') dispatch({ type: 'MOVE', index, by: self.deviceId })
    else send({ type: 'move', index, from: self.deviceId })
  }
  const nextGame = () => {
    if (role === 'referee') dispatch({ type: 'NEXT_GAME' })
    else send({ type: 'next-game', from: self.deviceId })
  }
  const resign = () => {
    setConfirmResign(false)
    if (role === 'referee') dispatch({ type: 'RESIGN', by: self.deviceId, reason: 'resigned', at: now() })
    else send({ type: 'resign', from: self.deviceId })
  }

  const myTurn = isPlayer && mySide !== null && canSeatMove(state.game, seatOfSide(mySide))
  const finished = state.game.status !== 'playing'
  const youWonGame =
    isPlayer && mySide !== null && state.game.status === 'won' && state.game.winner !== null && seatOf(state.game, state.game.winner) === seatOfSide(mySide)

  const nameOf = (side: SeriesSide) => (mySide === side && isPlayer ? 'You' : playerOf(state, side).nickname)
  const seriesBar = `${nameOf('challenger')} ${state.score.challenger} · ${state.score.challenged} ${nameOf('challenged')}`
  const gameLabel = isTieBreak(state) ? `Tie breaker · Game ${state.gameNumber}` : `Game ${state.gameNumber} of ${SERIES_GAMES}`
  const status = waiting ? `Waiting for ${opponent?.nickname}…` : seriesStatusText(state, isPlayer ? self.deviceId : null)

  return (
    <section className="flex flex-1 flex-col gap-7">
      <header className="flex items-center justify-between">
        {isPlayer ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirmResign(true)} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
            Resign
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onExit(null)} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
            ← Back
          </Button>
        )}
        <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">
          {isPlayer ? gameLabel : `Watching · ${gameLabel}`}
        </span>
      </header>

      <p aria-label="Series score" className="rounded-[18px] bg-muted/70 px-4 py-3 text-center text-lg font-semibold tabular-nums dark:bg-muted/50">
        {seriesBar}
      </p>

      <div className="my-auto flex flex-col gap-5 pb-6">
        <StatusBar state={state.game} message={status} mark={!waiting} />
        <div className="relative">
          <Board board={state.game.board} winningLine={state.game.winningLine} disabled={finished || !myTurn || waiting} onSelect={play} />
          {youWonGame && <Celebration />}
        </div>
      </div>

      {isPlayer ? (
        <Button
          size="lg"
          variant={phase === 'between' ? 'default' : 'outline'}
          className={cn('min-h-14 w-full rounded-[18px] text-base font-semibold')}
          disabled={phase !== 'between'}
          onClick={nextGame}
        >
          Next game
        </Button>
      ) : (
        <Button size="lg" variant="outline" className="min-h-14 w-full rounded-[18px] text-base font-semibold" onClick={() => onExit(null)}>
          Back
        </Button>
      )}

      <AlertDialog open={confirmResign} onOpenChange={setConfirmResign}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Resign the series?</AlertDialogTitle>
            <AlertDialogDescription>It counts as a loss, whatever the score.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep playing</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={resign}>
              Yes, resign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showTie && !state.result && <Interstitial title="Tie breaker" subtitle="Level after 10 games. Next win takes it." onDone={hideTie} />}
      {state.result && (
        <Interstitial
          {...resultCopy(state.result, self.deviceId)}
          actions={[{ label: 'Back to room', onClick: () => onExit(state.result), primary: true }]}
        />
      )}
    </section>
  )
}
