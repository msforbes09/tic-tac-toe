import { useEffect, useReducer, useRef, useState } from 'react'
import { Board } from './Board'
import { Celebration } from './Celebration'
import { ScoreBar } from './ScoreBar'
import { StatusBar } from './StatusBar'
import { TopCard } from './TopCard'
import { Button } from '@/components/ui/button'
import { chooseMove } from '@/lib/bot'
import { feedbackForChange, type Feedback } from '@/lib/feedback'
import { nextPlayer } from '@/lib/game'
import { newEntryId, saveGame, type HistoryEntry, type HistoryStorage } from '@/lib/history'
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
import { saveSetup } from '@/lib/setup'
import type { Board as BoardModel, Outcome, Settings } from '@/lib/types'
import type { ShareLink } from '@/platform/share'
import { createGameState, gameReducer, seatOf, symbolOf } from '@/state/reducer'

export const BOT_DELAY_MS = 400

export type GameScreenProps = {
  settings: Settings
  storage: HistoryStorage
  feedback: Feedback
  onBack: () => void
  /** For bragging from the top-of-the-pack card. */
  share?: ShareLink
  siteUrl?: string
  /** Every finished two-player or bot game, after it is saved locally; bot games bring the moved ladder. */
  onRecorded?: (entry: HistoryEntry, ladder: Ladder | null) => void
}

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const

const NOTE_FOR: Partial<Record<Moment, (band: string) => string>> = {
  promoted: (band) => `Promoted to ${band}`,
  top: () => "Top of the pack. Nobody's above you now.",
}

export function GameScreen({ settings, storage, feedback, onBack, share, siteUrl, onRecorded }: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, settings, createGameState)
  const recordedBoard = useRef<BoardModel | null>(null)
  // Null until the first board is seen, so the opening board plays the start cue.
  const previousBoard = useRef<BoardModel | null>(null)

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

  const botSymbol = settings.mode === 'bot' ? symbolOf(state, 'p2') : null
  const isBotTurn = botSymbol !== null && state.status === 'playing' && nextPlayer(state.board) === botSymbol
  // Confetti when you beat the bot. Two players sharing a phone get none.
  const youWon =
    settings.mode === 'bot' && state.status === 'won' && state.winner !== null && seatOf(state, state.winner) === 'p1'

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
    const event = feedbackForChange(previousBoard.current, state.board, botSymbol)
    previousBoard.current = state.board
    if (event) feedback.play(event)
  }, [state.board, botSymbol, feedback])

  // Record each finished game exactly once. Two-player games are logged from Player 1's side and
  // never touch the ladder; bot games move it. The ref guards StrictMode's double effect run.
  useEffect(() => {
    if (settings.mode === 'online' || state.status === 'playing' || state.recorded) return
    if (settings.mode === 'bot' && !ladder) return
    if (recordedBoard.current === state.board) return
    recordedBoard.current = state.board
    const outcome: Outcome = state.status === 'draw' ? 'draw' : (state.winner as Outcome)
    const now = Date.now()
    const isBot = settings.mode === 'bot' && ladder !== null
    // The band the game was labelled with: what was picked for the first game, the real band after.
    const band = isBot ? (gamesPlayed > 0 ? bandOf(rung) : settings.difficulty) : null
    const entry: HistoryEntry = {
      id: newEntryId(),
      timestamp: now,
      mode: settings.mode,
      difficulty: band,
      outcome,
      p1Symbol: state.p1Symbol,
      ...(isBot ? { rung } : {}),
    }
    try {
      saveGame(storage, entry)
    } catch {
      // Storage unavailable (private mode, quota). History is best-effort.
    }
    let next: Ladder | null = null
    if (isBot && ladder) {
      const result: GameResult = outcome === 'draw' ? 'draw' : seatOf(state, outcome) === 'p1' ? 'win' : 'loss'
      next = advance(ladder, result, now)
      const what = momentAfter(ladder, next, result)
      saveLadder(storage, next)
      saveSetup(storage, { ...settings, difficulty: bandOf(next.rung ?? rung) })
      setLadder(next)
      setGamesPlayed((n) => n + 1)
      setMoment(what)
      if (what === 'top-held') setCardOpen(true)
      if (what && what !== 'lost-top') feedback.play({ kind: 'start' })
    }
    onRecorded?.(entry, next)
    dispatch({ type: 'RECORDED' })
  }, [state.status, state.recorded, state.board, state.winner, state.p1Symbol, settings, storage, ladder, rung, gamesPlayed, feedback, onRecorded])

  const finished = state.status !== 'playing'
  // The chip says what you picked for the first game, then the band the rung is really in.
  const shownBand = ladder && gamesPlayed > 0 ? bandOf(rung) : settings.difficulty
  const badge = settings.mode === 'bot' ? `Bot · ${DIFFICULTY_LABEL[shownBand]}` : 'Two player'
  const note = finished && moment ? NOTE_FOR[moment]?.(DIFFICULTY_LABEL[bandOf(rung)]) : undefined
  const newGame = () => {
    setMoment(null)
    dispatch({ type: 'NEW_GAME' })
  }

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

      <ScoreBar mode={settings.mode} score={state.score} p1Symbol={state.p1Symbol} />

      <div className="my-auto flex flex-col gap-5 pb-6">
        <StatusBar state={state} note={note} />
        <div className="relative">
          <Board
            board={state.board}
            winningLine={state.winningLine}
            disabled={finished || isBotTurn}
            onSelect={(index) => dispatch({ type: 'MOVE', index })}
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
