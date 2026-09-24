import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Board } from './Board'
import { Celebration } from './Celebration'
import { ScoreBar } from './ScoreBar'
import { StatusBar } from './StatusBar'
import { TopCard } from './TopCard'
import { Button } from '@/components/ui/button'
import { chooseMove } from '@/lib/bot'
import { feedbackForChange, type Feedback } from '@/lib/feedback'
import { nextPlayer } from '@/lib/game'
import { newEntryId, saveGame, type HistoryStorage } from '@/lib/history'
import {
  advance,
  bandOf,
  loadLadder,
  momentAfter,
  rungForSelection,
  saveLadder,
  type GameResult,
  type Ladder,
  type Moment,
} from '@/lib/ladder'
import type { Role } from '@/lib/room'
import type { RoomConnection } from '@/lib/roomConnection'
import { saveSetup } from '@/lib/setup'
import type { Board as BoardModel, Outcome, Seat, Settings } from '@/lib/types'
import type { ShareLink } from '@/platform/share'
import { roomReducer } from '@/state/online'
import { canSeatMove, createGameState, seatOf, snapshotOf, symbolOf } from '@/state/reducer'

export const BOT_DELAY_MS = 400

export type OnlineSession = {
  role: Role
  code: string
  connection: RoomConnection
  /** Whether the other player is in the room right now. */
  friendPresent: boolean
}

export type GameScreenProps = {
  settings: Settings
  storage: HistoryStorage
  feedback: Feedback
  onBack: () => void
  online?: OnlineSession
  /** For bragging from the top-of-the-pack card. */
  share?: ShareLink
  siteUrl?: string
}

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const

const NOTE_FOR: Partial<Record<Moment, (band: string) => string>> = {
  promoted: (band) => `Promoted to ${band}`,
  top: () => "Top of the pack. Nobody's above you now.",
}

export function GameScreen({ settings, storage, feedback, onBack, online, share, siteUrl }: GameScreenProps) {
  const role = online?.role ?? null
  const reducer = useMemo(() => roomReducer(role), [role])
  const [state, dispatch] = useReducer(reducer, settings, createGameState)
  const recordedBoard = useRef<BoardModel | null>(null)
  // Null until the first board is seen, so the opening board plays the start cue.
  const previousBoard = useRef<BoardModel | null>(null)
  const [waiting, setWaiting] = useState(false)

  // The ladder, for bot games: resolved once from the saved rung and the picked band, then moved
  // after each finished game. The bot plays the rung the game started on.
  // Resolved without writing, so StrictMode's second run of the initialiser sees the same storage;
  // the effect below persists it, and is idempotent.
  const [ladder, setLadder] = useState<Ladder | null>(() => {
    if (settings.mode !== 'bot') return null
    const saved = loadLadder(storage)
    return { ...saved, rung: rungForSelection(saved.rung, settings.difficulty) }
  })
  const rung = ladder?.rung ?? 1
  useEffect(() => {
    if (ladder) saveLadder(storage, ladder)
    // Only the resolved starting rung; later moves save themselves as they happen.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [moment, setMoment] = useState<Moment | null>(null)
  const [cardOpen, setCardOpen] = useState(false)

  const seat: Seat = role === 'guest' ? 'p2' : 'p1'
  const friendPresent = online ? online.friendPresent : true
  const connection = online?.connection

  // Incoming room messages, from either side. A guest's hello means its screen is up and may have
  // missed the snapshot sent on its arrival, so the host answers with the current state.
  const latest = useRef(state)
  latest.current = state
  useEffect(() => {
    if (!connection) return
    return connection.onMessage((message) => {
      if (message.type === 'hello') {
        if (role === 'host') connection.send({ type: 'state', state: snapshotOf(latest.current) })
        return
      }
      dispatch({ type: 'ROOM_MESSAGE', message })
    })
  }, [connection, role])

  // The guest announces itself once its screen is listening.
  useEffect(() => {
    if (role === 'guest' && connection) connection.send({ type: 'hello' })
  }, [role, connection])

  // The host shares its state after every change and whenever the friend (re)joins.
  useEffect(() => {
    if (role !== 'host' || !connection || !friendPresent) return
    connection.send({ type: 'state', state: snapshotOf(state) })
  }, [role, connection, friendPresent, state])

  // The friend came back: drop the waiting notice.
  useEffect(() => {
    if (friendPresent) setWaiting(false)
  }, [friendPresent])

  const play = (index: number) => {
    if (role === 'guest') connection?.send({ type: 'move', index })
    else dispatch({ type: 'MOVE', index })
  }
  const newGame = () => {
    setMoment(null)
    if (role === 'guest') connection?.send({ type: 'new-game' })
    else dispatch({ type: 'NEW_GAME' })
  }

  const botSymbol = settings.mode === 'bot' ? symbolOf(state, 'p2') : null
  const isBotTurn = botSymbol !== null && state.status === 'playing' && nextPlayer(state.board) === botSymbol
  // Your opponent's symbol, whose win sounds like a loss: the bot, or your friend online.
  const opponentSymbol = botSymbol ?? (online ? symbolOf(state, seat === 'p1' ? 'p2' : 'p1') : null)
  // Confetti when you beat the bot or your friend. Two players sharing a phone get none.
  const youWon =
    settings.mode !== 'pvp' && state.status === 'won' && state.winner !== null && seatOf(state, state.winner) === seat

  // Bot reply, delayed so it feels like a turn rather than an instant reaction.
  useEffect(() => {
    if (!isBotTurn) return
    const id = setTimeout(() => {
      dispatch({ type: 'MOVE', index: chooseMove(state.board, rung) })
    }, BOT_DELAY_MS)
    return () => clearTimeout(id)
  }, [isBotTurn, state.board, rung])

  // Sound and haptics for the start of each game and every new mark, yours and theirs alike.
  useEffect(() => {
    const event = feedbackForChange(previousBoard.current, state.board, opponentSymbol)
    previousBoard.current = state.board
    if (event) feedback.play(event)
  }, [state.board, opponentSymbol, feedback])

  // Record each finished game exactly once. The ref guards StrictMode's double effect run.
  useEffect(() => {
    if (state.status === 'playing' || state.recorded) return
    if (recordedBoard.current === state.board) return
    recordedBoard.current = state.board
    const outcome: Outcome = state.status === 'draw' ? 'draw' : (state.winner as Outcome)
    const now = Date.now()
    const band = ladder && gamesPlayed > 0 ? bandOf(rung) : settings.difficulty
    try {
      saveGame(storage, {
        id: newEntryId(),
        timestamp: now,
        mode: settings.mode,
        difficulty: settings.mode === 'bot' ? band : null,
        outcome,
        p1Symbol: online ? symbolOf(state, seat) : state.p1Symbol,
        ...(ladder ? { rung } : {}),
      })
    } catch {
      // Storage unavailable (private mode, quota). History is best-effort.
    }
    if (ladder) {
      const result: GameResult = outcome === 'draw' ? 'draw' : seatOf(state, outcome) === 'p1' ? 'win' : 'loss'
      const next = advance(ladder, result, now)
      const what = momentAfter(ladder, next, result)
      saveLadder(storage, next)
      saveSetup(storage, { ...settings, difficulty: bandOf(next.rung ?? rung) })
      setLadder(next)
      setGamesPlayed((n) => n + 1)
      setMoment(what)
      if (what === 'top-held') setCardOpen(true)
      if (what && what !== 'lost-top') feedback.play({ kind: 'start' })
    }
    dispatch({ type: 'RECORDED' })
  }, [state.status, state.recorded, state.board, state.winner, state.p1Symbol, settings, storage, online, seat, ladder, rung, gamesPlayed, feedback])

  const finished = state.status !== 'playing'
  const myTurn = online ? canSeatMove(state, seat) : true
  const friendLeft = online !== undefined && !friendPresent
  // The chip says what you picked for the first game, then the band the rung is really in.
  const shownBand = ladder && gamesPlayed > 0 ? bandOf(rung) : settings.difficulty
  const badge =
    settings.mode === 'bot'
      ? `Bot · ${DIFFICULTY_LABEL[shownBand]}`
      : settings.mode === 'online'
        ? `Online · ${online?.code ?? ''}`
        : 'Two player'
  const note = finished && moment ? NOTE_FOR[moment]?.(DIFFICULTY_LABEL[bandOf(rung)]) : undefined

  return (
    <section className="flex flex-1 flex-col gap-7">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
          ← Back
        </Button>
        <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">
          {badge}
        </span>
      </header>

      <ScoreBar mode={settings.mode} score={state.score} p1Symbol={state.p1Symbol} youSeat={online ? seat : undefined} />

      <div className="my-auto flex flex-col gap-5 pb-6">
        {friendLeft && !waiting && (
          <div
            role="alert"
            className="rise-in flex flex-col items-center gap-4 rounded-[18px] bg-muted/70 p-5 text-center dark:bg-muted/50"
          >
            <p className="text-lg font-semibold">Your friend left</p>
            <div className="flex w-full gap-2">
              {role === 'host' && (
                <Button
                  variant="outline"
                  className="min-h-12 flex-1 rounded-[16px] text-base"
                  onClick={() => setWaiting(true)}
                >
                  Wait
                </Button>
              )}
              <Button className="min-h-12 flex-1 rounded-[16px] text-base font-medium" onClick={onBack}>
                Back
              </Button>
            </div>
          </div>
        )}
        <StatusBar
          state={state}
          youSeat={online ? seat : undefined}
          message={friendLeft && waiting ? 'Waiting for your friend…' : undefined}
          note={note}
        />
        <div className="relative">
          <Board
            board={state.board}
            winningLine={state.winningLine}
            disabled={finished || isBotTurn || !myTurn || friendLeft}
            onSelect={play}
          />
          {(youWon || cardOpen) && <Celebration />}
          {cardOpen && <TopCard share={share} siteUrl={siteUrl} onClose={() => setCardOpen(false)} />}
        </div>
      </div>

      <Button
        size="lg"
        variant={finished ? 'default' : 'outline'}
        className="min-h-14 w-full rounded-[18px] text-base font-medium"
        onClick={newGame}
      >
        {finished && moment === 'lost-top' ? 'Take it back' : 'New game'}
      </Button>
    </section>
  )
}
