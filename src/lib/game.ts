import type { Board, Player, WinLine, Winner } from './types'

export const WIN_LINES: WinLine[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function createBoard(): Board {
  return Array<null>(9).fill(null)
}

export function nextPlayer(board: Board): Player {
  const xs = board.filter((c) => c === 'X').length
  const os = board.filter((c) => c === 'O').length
  return xs === os ? 'X' : 'O'
}

export function availableMoves(board: Board): number[] {
  return board.flatMap((cell, i) => (cell === null ? [i] : []))
}
