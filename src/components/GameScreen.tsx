import { useEffect, useReducer, useRef, useState } from 'react'
import { Board } from './Board'
import { Celebration } from './Celebration'
import { ScoreBar } from './ScoreBar'
import { StatusBar } from './StatusBar'
import { Button } from '@/components/ui/button'
import type { GameEvent } from '@/lib/achievements'
import { chooseMove } from '@/lib/bot'
import { banterFor, type Tone } from '@/lib/banter'
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
import type { KnockEvent } from '@/lib/knock'
import { saveSetup } from '@/lib/setup'
import type { Board as BoardModel, Outcome, Settings } from '@/lib/types'
import { createGameState, gameReducer, seatOf, symbolOf } from '@/state/reducer'

export const BOT_DELAY_MS = 400

export type GameScreenProps = {
  settings: Settings
  storage: HistoryStorage
  feedback: Feedback
  onBack: () => void
  /** Every finished, non-voided game, for the achievements; bot games carry the ladder before and after. */
  onAchievement?: (event: GameEvent) => void
  /** Developer mode: the chip shows the rung and streak. */
  dev?: boolean
  /** Reports board taps for the developer knock; returns true when the knock just completed. */
  onKnock?: (event: KnockEvent) => boolean | void
  /** Every finished two-player or bot game, after it is saved locally; bot games bring the moved ladder. */
  onRecorded?: (entry: HistoryEntry, ladder: Ladder | null) => void
  /** How the bot talks after a game. Friendly unless Settings says aggressive. */
  tone?: Tone
}

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const

export function GameScreen({
  settings,
  storage,
  feedback,
  onBack,
  onAchievement,
  dev,
  onKnock,
  onRecorded,
  tone = 'friendly',
}: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, settings, createGameState)
  const recordedBoard = useRef<BoardModel | null>(null)
  // Null until the first board is seen, so the opening board plays the start cue.
  const previousBoard = useRef<BoardModel | null>(null)

  // The ladder, for bot games: resolved once from the saved rung and the picked band, then moved
  // after each finished game. The bot plays the rung the game started on. The nudge from the picked
  // band lives in memory only until a game finishes: backing out before then leaves the saved rung.
  const [ladder, setLadder] = useState<Ladder | null>(() => {
    if (settings.mode !== 'bot') return null
    const saved = loadLadder(storage)
    return { ...saved, rung: rungForSelection(saved.rung, settings.difficulty) }
  })
  const rung = ladder?.rung ?? 1
  const [gamesPlayed, setGamesPlayed] = useState(0)
  // Only 'lost-top' matters here (the New game button reads Take it back); the rest are achievements now.
  const [moment, setMoment] = useState<Moment | null>(null)
  // What the bot said about the last game.
  const [banter, setBanter] = useState<string | null>(null)

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
  // never touch the ladder; bot games move it. A voided game (developer knock) leaves no trace.
  // The ref guards StrictMode's double effect run.
  useEffect(() => {
    if (settings.mode === 'online' || state.status === 'playing' || state.recorded || state.voided) return
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
    const result: GameResult = outcome === 'draw' ? 'draw' : seatOf(state, outcome) === 'p1' ? 'win' : 'loss'
    let next: Ladder | null = null
    if (isBot && ladder) {
      next = advance(ladder, result, now)
      saveLadder(storage, next)
      saveSetup(storage, { ...settings, difficulty: bandOf(next.rung ?? rung) })
      setLadder(next)
      setGamesPlayed((n) => n + 1)
      setMoment(momentAfter(ladder, next, result))
      setBanter(banterFor(bandOf(rung), result, Math.random, tone))
    }
    onRecorded?.(entry, next)
    onAchievement?.({
      kind: 'game',
      mode: settings.mode,
      result,
      board: state.board,
      symbol: state.p1Symbol,
      finishedAt: now,
      // The real band of the rung played, not the label: "first win at Hard" means a Hard bot.
      ...(isBot ? { band: bandOf(rung), rungBefore: rung, rungAfter: next?.rung ?? rung } : {}),
    })
    dispatch({ type: 'RECORDED' })
  }, [state.status, state.recorded, state.board, state.winner, state.p1Symbol, state.voided, settings, storage, ladder, rung, gamesPlayed, onRecorded, onAchievement, tone])

  const finished = state.status !== 'playing'
  // The chip says what you picked for the first game, then the band the rung is really in.
  const shownBand = ladder && gamesPlayed > 0 ? bandOf(rung) : settings.difficulty
  // Developer mode appends the rung and, when there is one, the streak.
  const streak = ladder?.streak ?? 0
  const devSuffix = dev && ladder ? ` · ${rung}${streak > 0 ? ` · +${streak}` : streak < 0 ? ` · −${-streak}` : ''}` : ''
  const badge = settings.mode === 'bot' ? `Bot · ${DIFFICULTY_LABEL[shownBand]}${devSuffix}` : 'Two player'
  // Every board tap feeds the knock; the tap that completes it stamps the cell and voids the game.
  const tap = (index: number) => {
    if (onKnock?.(`cell:${index}`) === true) dispatch({ type: 'OVERRIDE', index })
  }
  const note = finished ? (banter ?? undefined) : undefined
  // Three straight wins or more get a pill; losing streaks stay the ladder's secret.
  const hotStreak = ladder && streak >= 3 ? streak : 0
  const newGame = () => {
    setMoment(null)
    setBanter(null)
    dispatch({ type: 'NEW_GAME' })
  }

  return (
    <section className="flex flex-1 flex-col gap-7">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
          ← Back
        </Button>
        {hotStreak > 0 && (
          <span className="ml-auto mr-2 rounded-full bg-player-o-soft px-3 py-1 text-[13px] font-medium text-player-o">
            <span aria-hidden="true">🔥 </span>
            {hotStreak} in a row
          </span>
        )}
        <span className="rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">{badge}</span>
      </header>

      <ScoreBar mode={settings.mode} score={state.score} p1Symbol={state.p1Symbol} />

      <div className="my-auto flex flex-col gap-5 pb-6">
        <StatusBar state={state} note={note} message={state.voided ? 'Game voided' : undefined} />
        <div className="relative">
          <Board
            board={state.board}
            winningLine={state.winningLine}
            disabled={finished || isBotTurn || state.voided}
            onSelect={(index) => dispatch({ type: 'MOVE', index })}
            onTap={tap}
          />
          {youWon && <Celebration />}
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
