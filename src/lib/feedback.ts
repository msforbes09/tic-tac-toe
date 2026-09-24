import { getWinner, isDraw } from './game'
import type { Board, Player } from './types'

export type FeedbackEvent =
  | { kind: 'move'; player: Player }
  | { kind: 'win'; player: Player }
  | { kind: 'draw' }
  | { kind: 'lose' }
  | { kind: 'start' }
  | { kind: 'challenge' }
  | { kind: 'accepted' }
  /** The opening splash: plays with no user gesture, so implementations may have to drop it. */
  | { kind: 'splash' }

/** Plays sound and haptics for a game event. Implementations must never throw. */
export type Feedback = { play: (event: FeedbackEvent) => void }

const marks = (board: Board) => board.filter((c) => c !== null).length

/**
 * What feedback a board change deserves: an empty board after nothing or after a played board → start;
 * one new mark → move, win, lose, or draw. Anything else → none.
 * Pass the opponent's symbol (the bot, or your friend online) so their win sounds like a loss.
 */
export function feedbackForChange(prev: Board | null, next: Board, opponent: Player | null = null): FeedbackEvent | null {
  if (marks(next) === 0) return prev === null || marks(prev) > 0 ? { kind: 'start' } : null
  if (prev === null || marks(next) !== marks(prev) + 1) return null
  const winner = getWinner(next)
  if (winner) return winner.player === opponent ? { kind: 'lose' } : { kind: 'win', player: winner.player }
  if (isDraw(next)) return { kind: 'draw' }
  const index = next.findIndex((cell, i) => cell !== prev[i])
  return { kind: 'move', player: next[index] as Player }
}
