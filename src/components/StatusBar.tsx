import { nextPlayer } from '@/lib/game'
import type { GameState } from '@/state/reducer'

export function statusText(state: GameState): string {
  const bot = state.settings.mode === 'bot'
  if (state.status === 'draw') return "It's a draw"
  if (state.status === 'won') {
    if (!bot) return `${state.winner} wins!`
    return state.winner === 'X' ? 'You win!' : 'Bot wins!'
  }
  const turn = nextPlayer(state.board)
  if (!bot) return `${turn}'s turn`
  return turn === 'X' ? 'Your turn' : 'Bot is thinking…'
}

export function StatusBar({ state }: { state: GameState }) {
  return (
    <p aria-live="polite" className="text-center text-lg font-medium">
      {statusText(state)}
    </p>
  )
}
