import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Board } from './Board'
import { Celebration } from './Celebration'
import { ScoreBar } from './ScoreBar'
import { StatusBar } from './StatusBar'
import { Button } from '@/components/ui/button'
import { chooseMove } from '@/lib/bot'
import { feedbackForChange, type Feedback } from '@/lib/feedback'
import { nextPlayer } from '@/lib/game'
import { newEntryId, saveGame, type HistoryStorage } from '@/lib/history'
import type { Role } from '@/lib/room'
import type { RoomConnection } from '@/lib/roomConnection'
import type { Board as BoardModel, Outcome, Seat, Settings } from '@/lib/types'
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
}

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const

export function GameScreen({ settings, storage, feedback, onBack, online }: GameScreenProps) {
  const role = online?.role ?? null
  const reducer = useMemo(() => roomReducer(role), [role])
  const [state, dispatch] = useReducer(reducer, settings, createGameState)
  const recordedBoard = useRef<BoardModel | null>(null)
  const previousBoard = useRef(state.board)
  const [waiting, setWaiting] = useState(false)

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
    if (role === 'guest') connection?.send({ type: 'new-game' })
    else dispatch({ type: 'NEW_GAME' })
  }

  const botSymbol = settings.mode === 'bot' ? symbolOf(state, 'p2') : null
  const isBotTurn = botSymbol !== null && state.status === 'playing' && nextPlayer(state.board) === botSymbol
  const youBeatTheBot =
    settings.mode === 'bot' && state.status === 'won' && state.winner !== null && seatOf(state, state.winner) === 'p1'

  // Bot reply, delayed so it feels like a turn rather than an instant reaction.
  useEffect(() => {
    if (!isBotTurn) return
    const id = setTimeout(() => {
      dispatch({ type: 'MOVE', index: chooseMove(state.board, settings.difficulty) })
    }, BOT_DELAY_MS)
    return () => clearTimeout(id)
  }, [isBotTurn, state.board, settings.difficulty])

  // Sound and haptics for every new mark, the player's and the bot's alike.
  useEffect(() => {
    const event = feedbackForChange(previousBoard.current, state.board, botSymbol)
    previousBoard.current = state.board
    if (event) feedback.play(event)
  }, [state.board, botSymbol, feedback])

  // Record each finished game exactly once. The ref guards StrictMode's double effect run.
  useEffect(() => {
    if (state.status === 'playing' || state.recorded) return
    if (recordedBoard.current === state.board) return
    recordedBoard.current = state.board
    const outcome: Outcome = state.status === 'draw' ? 'draw' : (state.winner as Outcome)
    try {
      saveGame(storage, {
        id: newEntryId(),
        timestamp: Date.now(),
        mode: settings.mode,
        difficulty: settings.mode === 'bot' ? settings.difficulty : null,
        outcome,
        p1Symbol: online ? symbolOf(state, seat) : state.p1Symbol,
      })
    } catch {
      // Storage unavailable (private mode, quota). History is best-effort.
    }
    dispatch({ type: 'RECORDED' })
  }, [state.status, state.recorded, state.board, state.winner, state.p1Symbol, settings, storage, online, seat])

  const finished = state.status !== 'playing'
  const myTurn = online ? canSeatMove(state, seat) : true
  const friendLeft = online !== undefined && !friendPresent
  const badge =
    settings.mode === 'bot'
      ? `Bot · ${DIFFICULTY_LABEL[settings.difficulty]}`
      : settings.mode === 'online'
        ? `Online · ${online?.code ?? ''}`
        : 'Two player'

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
              <Button className="min-h-12 flex-1 rounded-[16px] text-base font-semibold" onClick={onBack}>
                Back
              </Button>
            </div>
          </div>
        )}
        <StatusBar
          state={state}
          youSeat={online ? seat : undefined}
          message={friendLeft && waiting ? 'Waiting for your friend…' : undefined}
        />
        <div className="relative">
          <Board
            board={state.board}
            winningLine={state.winningLine}
            disabled={finished || isBotTurn || !myTurn || friendLeft}
            onSelect={play}
          />
          {youBeatTheBot && <Celebration />}
        </div>
      </div>

      <Button
        size="lg"
        variant={finished ? 'default' : 'outline'}
        className="min-h-14 w-full rounded-[18px] text-base font-semibold"
        onClick={newGame}
      >
        New game
      </Button>
    </section>
  )
}
