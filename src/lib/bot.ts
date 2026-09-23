import { availableMoves, getWinner, isDraw, makeMove } from './game'
import type { Board, Difficulty, Player } from './types'

export const BOT: Player = 'O'
export const HUMAN: Player = 'X'

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

function mediumMove(board: Board, rng: Rng): number {
  const wins = winningMoves(board, BOT)
  if (wins.length > 0) return pick(wins, rng)
  const blocks = winningMoves(board, HUMAN)
  if (blocks.length > 0) return pick(blocks, rng)
  return easyMove(board, rng)
}

function other(player: Player): Player {
  return player === 'X' ? 'O' : 'X'
}

// Score from the bot's perspective. Faster wins score higher; slower losses score higher.
function minimax(board: Board, toMove: Player, depth: number): number {
  const winner = getWinner(board)
  if (winner) return winner.player === BOT ? 10 - depth : depth - 10
  if (isDraw(board)) return 0

  const scores = availableMoves(board).map((i) =>
    minimax(makeMove(board, i, toMove), other(toMove), depth + 1),
  )
  return toMove === BOT ? Math.max(...scores) : Math.min(...scores)
}

function hardMove(board: Board): number {
  let bestScore = -Infinity
  let bestMove = -1
  for (const i of availableMoves(board)) {
    const score = minimax(makeMove(board, i, BOT), HUMAN, 1)
    if (score > bestScore) {
      bestScore = score
      bestMove = i
    }
  }
  return bestMove
}

export function chooseMove(board: Board, difficulty: Difficulty, rng: Rng = Math.random): number {
  if (availableMoves(board).length === 0) {
    throw new Error('No moves available')
  }
  switch (difficulty) {
    case 'easy':
      return easyMove(board, rng)
    case 'medium':
      return mediumMove(board, rng)
    case 'hard':
      return hardMove(board)
  }
}
