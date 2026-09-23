import { availableMoves, getWinner, makeMove } from './game'
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
      return mediumMove(board, rng)
  }
}
