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

export function getWinner(board: Board): Winner | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    const v = board[a]
    if (v !== null && v === board[b] && v === board[c]) {
      return { player: v, line }
    }
  }
  return null
}

export function isDraw(board: Board): boolean {
  return availableMoves(board).length === 0 && getWinner(board) === null
}

export function isGameOver(board: Board): boolean {
  return getWinner(board) !== null || isDraw(board)
}

export function makeMove(board: Board, index: number, player: Player): Board {
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    throw new RangeError(`Cell index out of range: ${index}`)
  }
  if (isGameOver(board)) {
    throw new Error('Game is already over')
  }
  if (board[index] !== null) {
    throw new Error(`Cell ${index} is already taken`)
  }
  const next = board.slice()
  next[index] = player
  return next
}
