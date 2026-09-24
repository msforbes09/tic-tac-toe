import { getWinner, isDraw } from './game'
import type { Board, Player } from './types'

export type FeedbackEvent =
  | { kind: 'move'; player: Player }
  | { kind: 'win'; player: Player }
  | { kind: 'draw' }
  | { kind: 'lose' }

/** Plays sound and haptics for a game event. Implementations must never throw. */
export type Feedback = { play: (event: FeedbackEvent) => void }

const marks = (board: Board) => board.filter((c) => c !== null).length

/**
 * What feedback a board change deserves: one new mark → move, win, lose, or draw. Anything else → none.
 * Pass the bot's symbol in bot mode so a bot win sounds like a loss.
 */
export function feedbackForChange(prev: Board, next: Board, bot: Player | null = null): FeedbackEvent | null {
  if (marks(next) !== marks(prev) + 1) return null
  const winner = getWinner(next)
  if (winner) return winner.player === bot ? { kind: 'lose' } : { kind: 'win', player: winner.player }
  if (isDraw(next)) return { kind: 'draw' }
  const index = next.findIndex((cell, i) => cell !== prev[i])
  return { kind: 'move', player: next[index] as Player }
}
