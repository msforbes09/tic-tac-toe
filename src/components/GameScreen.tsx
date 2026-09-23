import { useEffect, useReducer, useRef } from 'react'
import { Board } from './Board'
import { StatusBar } from './StatusBar'
import { Button } from '@/components/ui/button'
import { chooseMove } from '@/lib/bot'
import { nextPlayer } from '@/lib/game'
import { newEntryId, saveGame, type HistoryStorage } from '@/lib/history'
import type { Board as BoardModel, Outcome, Settings } from '@/lib/types'
import { createGameState, gameReducer } from '@/state/reducer'

export const BOT_DELAY_MS = 400

export type GameScreenProps = {
  settings: Settings
  storage: HistoryStorage
  onBack: () => void
}

export function GameScreen({ settings, storage, onBack }: GameScreenProps) {
  const [state, dispatch] = useReducer(gameReducer, settings, createGameState)
  const recordedBoard = useRef<BoardModel | null>(null)

  const isBotTurn =
    settings.mode === 'bot' && state.status === 'playing' && nextPlayer(state.board) === 'O'

  // Bot reply, delayed so it feels like a turn rather than an instant reaction.
  useEffect(() => {
    if (!isBotTurn) return
    const id = setTimeout(() => {
      dispatch({ type: 'MOVE', index: chooseMove(state.board, settings.difficulty) })
    }, BOT_DELAY_MS)
    return () => clearTimeout(id)
  }, [isBotTurn, state.board, settings.difficulty])

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
      })
    } catch {
      // Storage unavailable (private mode, quota). History is best-effort.
    }
    dispatch({ type: 'RECORDED' })
  }, [state.status, state.recorded, state.board, state.winner, settings, storage])

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="min-h-11">
          ← Back
        </Button>
        <span className="text-sm text-muted-foreground">
          {settings.mode === 'bot' ? `Bot · ${settings.difficulty}` : 'Two player'}
        </span>
      </header>

      <StatusBar state={state} />

      <Board
        board={state.board}
        winningLine={state.winningLine}
        disabled={state.status !== 'playing' || isBotTurn}
        onSelect={(index) => dispatch({ type: 'MOVE', index })}
      />

      <Button size="lg" className="mt-auto min-h-12 w-full" onClick={() => dispatch({ type: 'NEW_GAME' })}>
        New game
      </Button>
    </section>
  )
}
