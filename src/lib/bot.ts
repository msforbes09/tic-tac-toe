import { availableMoves } from './game'
import type { Board, Difficulty, Player } from './types'

export const BOT: Player = 'O'
export const HUMAN: Player = 'X'

export type Rng = () => number

function pick(moves: number[], rng: Rng): number {
  return moves[Math.floor(rng() * moves.length)]
}

function easyMove(board: Board, rng: Rng): number {
  return pick(availableMoves(board), rng)
}

export function chooseMove(board: Board, difficulty: Difficulty, rng: Rng = Math.random): number {
  if (availableMoves(board).length === 0) {
    throw new Error('No moves available')
  }
  switch (difficulty) {
    case 'easy':
      return easyMove(board, rng)
    case 'medium':
    case 'hard':
      return easyMove(board, rng)
  }
}
