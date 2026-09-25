import { Mark } from './Mark'
import { nextPlayer } from '@/lib/game'
import type { Player, Seat } from '@/lib/types'
import { seatOf, type GameState } from '@/state/reducer'
import { cn } from '@/lib/utils'

const SEAT_NAME = { p1: 'Player 1', p2: 'Player 2' } as const

export function statusText(state: GameState, youSeat?: Seat): string {
  const mode = state.settings.mode
  if (state.status === 'draw') return "It's a draw"
  const player = state.status === 'won' && state.winner ? state.winner : nextPlayer(state.board)
  const seat = seatOf(state, player)
  if (mode === 'online') {
    const you = seat === (youSeat ?? 'p1')
    if (state.status === 'won') return you ? 'You win!' : 'You lost'
    return you ? 'Your move' : "Friend's turn"
  }
  if (state.status === 'won') {
    if (mode !== 'bot') return `${SEAT_NAME[seat]} wins!`
    return seat === 'p1' ? 'You win!' : 'You lost'
  }
  if (mode !== 'bot') return `${SEAT_NAME[seat]}'s turn`
  return seat === 'p1' ? 'Your move' : 'Bot is thinking…'
}

/** Whose turn the status line is about, for the accent mark. Null once the game is over, so the title sits centred. */
function statusPlayer(state: GameState): Player | null {
  if (state.status !== 'playing') return null
  return nextPlayer(state.board)
}

export function StatusBar({
  state,
  youSeat,
  message,
  note,
  mark = false,
}: {
  state: GameState
  youSeat?: Seat
  message?: string
  /** A second line under the status, e.g. a promotion. */
  note?: string
  /** Keep the mark of whoever is up beside a `message` too (online, whose status is a message). */
  mark?: boolean
}) {
  const player = message && !mark ? null : statusPlayer(state)
  const thinking =
    state.status === 'playing' && state.settings.mode === 'bot' && player !== null && seatOf(state, player) === 'p2'
  const finished = state.status !== 'playing'

  return (
    <div
      key={message ?? `${state.status}-${player ?? 'draw'}`}
      className={cn('rise-in flex min-h-9 flex-wrap items-center justify-center gap-x-2.5', finished && 'min-h-10')}
    >
      {player && (
        <span
          data-status-mark={player}
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
        {message ?? statusText(state, youSeat)}
      </p>
      {note && (
        <p aria-live="polite" className="rise-in basis-full text-center font-heading text-[15px] font-medium text-player-o">
          {note}
        </p>
      )}
    </div>
  )
}
