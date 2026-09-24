import { availableMoves, getWinner, isDraw, makeMove, nextPlayer } from './game'
import type { Board, Player } from './types'

export type Rng = () => number

/**
 * How the bot plays at a rung of the ladder (see lib/ladder.ts), as three chances per move:
 * take an open win, block a threat, otherwise play a minimax-best move rather than a random square.
 * Rung 1 is pure random, rung 11 always wins and blocks, rung 30 is perfect and cannot lose.
 */
export type Chances = { win: number; block: number; best: number }

export function chancesFor(rung: number): Chances {
  const r = Math.min(30, Math.max(1, rung))
  if (r <= 10) {
    return { win: Math.min(1, 0.2 * (r - 1)), block: 0.1 * (r - 1), best: 0 }
  }
  // Tuned by simulation (bot.test.ts): a perfect player wins ~11% at 75% best moves and ~4% at 91%.
  if (r <= 20) return { win: 1, block: 1, best: 0.07 * (r - 11) }
  if (r <= 29) return { win: 1, block: 1, best: 0.75 + 0.02 * (r - 21) }
  return { win: 1, block: 1, best: 1 }
}

function pick(moves: number[], rng: Rng): number {
  return moves[Math.floor(rng() * moves.length)]
}

function other(player: Player): Player {
  return player === 'X' ? 'O' : 'X'
}

function winningMoves(board: Board, player: Player): number[] {
  return availableMoves(board).filter((i) => getWinner(makeMove(board, i, player))?.player === player)
}

// Score from the bot's perspective. Faster wins score higher; slower losses score higher.
// Memoised on the position: the whole game has under six thousand, so simulations stay cheap.
const scores = new Map<string, number>()

function minimax(board: Board, bot: Player, toMove: Player, depth: number): number {
  const key = `${bot}${toMove}${depth}${board.map((c) => c ?? '.').join('')}`
  const cached = scores.get(key)
  if (cached !== undefined) return cached

  let score: number
  const winner = getWinner(board)
  if (winner) score = winner.player === bot ? 10 - depth : depth - 10
  else if (isDraw(board)) score = 0
  else {
    const results = availableMoves(board).map((i) => minimax(makeMove(board, i, toMove), bot, other(toMove), depth + 1))
    score = toMove === bot ? Math.max(...results) : Math.min(...results)
  }
  scores.set(key, score)
  return score
}

function bestMoves(board: Board, bot: Player): number[] {
  const moves = availableMoves(board)
  const scored = moves.map((i) => minimax(makeMove(board, i, bot), bot, other(bot), 1))
  const top = Math.max(...scored)
  return moves.filter((_, n) => scored[n] === top)
}

/** The bot plays for whichever player is to move, so it can open as X or reply as O. */
export function chooseMove(board: Board, rung: number, rng: Rng = Math.random): number {
  const moves = availableMoves(board)
  if (moves.length === 0) throw new Error('No moves available')
  const bot = nextPlayer(board)
  const { win, block, best } = chancesFor(rung)
  const roll = (chance: number) => chance >= 1 || rng() < chance

  const wins = winningMoves(board, bot)
  if (wins.length > 0 && roll(win)) return pick(wins, rng)
  const blocks = winningMoves(board, other(bot))
  if (blocks.length > 0 && roll(block)) return pick(blocks, rng)
  if (roll(best)) return pick(bestMoves(board, bot), rng)
  return pick(moves, rng)
}
