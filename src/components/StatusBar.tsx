import { Mark } from './Mark'
import { nextPlayer } from '@/lib/game'
import type { Player } from '@/lib/types'
import { seatOf, type GameState } from '@/state/reducer'
import { cn } from '@/lib/utils'

const SEAT_NAME = { p1: 'Player 1', p2: 'Player 2' } as const

export function statusText(state: GameState): string {
  const bot = state.settings.mode === 'bot'
  if (state.status === 'draw') return "It's a draw"
  const player = state.status === 'won' && state.winner ? state.winner : nextPlayer(state.board)
  const seat = seatOf(state, player)
  if (state.status === 'won') {
    if (!bot) return `${SEAT_NAME[seat]} wins!`
    return seat === 'p1' ? 'You win!' : 'Bot wins!'
  }
  if (!bot) return `${SEAT_NAME[seat]}'s turn`
  return seat === 'p1' ? 'Your turn' : 'Bot is thinking…'
}

/** Which player the status line is about, for the accent mark. Null for a draw. */
function statusPlayer(state: GameState): Player | null {
  if (state.status === 'draw') return null
  if (state.status === 'won') return state.winner
  return nextPlayer(state.board)
}

export function StatusBar({ state }: { state: GameState }) {
  const player = statusPlayer(state)
  const thinking =
    state.status === 'playing' && state.settings.mode === 'bot' && player !== null && seatOf(state, player) === 'p2'
  const finished = state.status !== 'playing'

  return (
    <div
      key={`${state.status}-${player ?? 'draw'}`}
      className={cn('rise-in flex min-h-9 items-center justify-center gap-2.5', finished && 'min-h-10')}
    >
      {player && (
        <span
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            player === 'X' ? 'bg-player-x-soft text-player-x' : 'bg-player-o-soft text-player-o',
            thinking && 'status-thinking',
          )}
        >
          <Mark player={player} weight={16} className="size-4" />
        </span>
      )}
      <p
        aria-live="polite"
        className={cn(
          'text-center font-semibold tracking-tight',
          finished ? 'text-2xl' : 'text-lg',
          state.status === 'draw' && 'text-muted-foreground',
        )}
      >
        {statusText(state)}
      </p>
    </div>
  )
}
