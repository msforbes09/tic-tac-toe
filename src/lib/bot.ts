import { availableMoves, getWinner, isDraw, makeMove, nextPlayer } from './game'
import type { Board, Difficulty, Player } from './types'

export type Rng = () => number

function pick(moves: number[], rng: Rng): number {
  return moves[Math.floor(rng() * moves.length)]
}

function winningMoves(board: Board, player: Player): number[] {
  return availableMoves(board).filter(
    (i) => getWinner(makeMove(board, i, player))?.player === player,
  )
}

function easyMove(board: Board, rng: Rng): number {
  return pick(availableMoves(board), rng)
}

function mediumMove(board: Board, bot: Player, rng: Rng): number {
  const wins = winningMoves(board, bot)
  if (wins.length > 0) return pick(wins, rng)
  const blocks = winningMoves(board, other(bot))
  if (blocks.length > 0) return pick(blocks, rng)
  return easyMove(board, rng)
}

function other(player: Player): Player {
  return player === 'X' ? 'O' : 'X'
}

// Score from the bot's perspective. Faster wins score higher; slower losses score higher.
function minimax(board: Board, bot: Player, toMove: Player, depth: number): number {
  const winner = getWinner(board)
  if (winner) return winner.player === bot ? 10 - depth : depth - 10
  if (isDraw(board)) return 0

  const scores = availableMoves(board).map((i) =>
    minimax(makeMove(board, i, toMove), bot, other(toMove), depth + 1),
  )
  return toMove === bot ? Math.max(...scores) : Math.min(...scores)
}

function hardMove(board: Board, bot: Player): number {
  let bestScore = -Infinity
  let bestMove = -1
  for (const i of availableMoves(board)) {
    const score = minimax(makeMove(board, i, bot), bot, other(bot), 1)
    if (score > bestScore) {
      bestScore = score
      bestMove = i
    }
  }
  return bestMove
}

/** The bot plays for whichever player is to move, so it can open as X or reply as O. */
export function chooseMove(board: Board, difficulty: Difficulty, rng: Rng = Math.random): number {
  if (availableMoves(board).length === 0) {
    throw new Error('No moves available')
  }
  const bot = nextPlayer(board)
  switch (difficulty) {
    case 'easy':
      return easyMove(board, rng)
    case 'medium':
      return mediumMove(board, bot, rng)
    case 'hard':
      return hardMove(board, bot)
  }
}
