import { describe, expect, it } from 'vitest'
import { availableMoves, createBoard, nextPlayer, getWinner, isDraw, isGameOver, makeMove } from './game'
import type { Board } from './types'

const b = (s: string): Board =>
  s.split('').map((c) => (c === '.' ? null : (c as 'X' | 'O')))

describe('createBoard', () => {
  it('returns nine empty cells', () => {
    expect(createBoard()).toEqual(Array(9).fill(null))
  })

  it('returns a fresh array each call', () => {
    expect(createBoard()).not.toBe(createBoard())
  })
})

describe('nextPlayer', () => {
  it('is X on an empty board', () => {
    expect(nextPlayer(createBoard())).toBe('X')
  })

  it('is O after X has moved', () => {
    expect(nextPlayer(b('X........'))).toBe('O')
  })

  it('is X when counts are equal', () => {
    expect(nextPlayer(b('XO.......'))).toBe('X')
  })
})

describe('availableMoves', () => {
  it('lists all indices on an empty board', () => {
    expect(availableMoves(createBoard())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('lists only empty cells', () => {
    expect(availableMoves(b('X.O.X.O..'))).toEqual([1, 3, 5, 7, 8])
  })

  it('is empty on a full board', () => {
    expect(availableMoves(b('XOXXOOOXX'))).toEqual([])
  })
})

describe('getWinner', () => {
  it('returns null on an empty board', () => {
    expect(getWinner(createBoard())).toBeNull()
  })

  it.each([
    ['XXX......', [0, 1, 2]],
    ['...XXX...', [3, 4, 5]],
    ['......XXX', [6, 7, 8]],
    ['X..X..X..', [0, 3, 6]],
    ['.X..X..X.', [1, 4, 7]],
    ['..X..X..X', [2, 5, 8]],
    ['X...X...X', [0, 4, 8]],
    ['..X.X.X..', [2, 4, 6]],
  ])('detects X winning on %s', (board, line) => {
    expect(getWinner(b(board))).toEqual({ player: 'X', line })
  })

  it('detects O winning', () => {
    expect(getWinner(b('OOO.XX.X.'))).toEqual({ player: 'O', line: [0, 1, 2] })
  })

  it('returns null when no line is complete', () => {
    expect(getWinner(b('XOXXOOOXX'))).toBeNull()
  })
})

describe('isDraw', () => {
  it('is false on an empty board', () => {
    expect(isDraw(createBoard())).toBe(false)
  })

  it('is true when the board is full with no winner', () => {
    expect(isDraw(b('XOXXOOOXX'))).toBe(true)
  })

  it('is false when the board is full but someone won', () => {
    expect(isDraw(b('XXXOOXOXO'))).toBe(false)
  })
})

describe('isGameOver', () => {
  it('is false mid-game', () => {
    expect(isGameOver(b('XO.......'))).toBe(false)
  })

  it('is true on a win', () => {
    expect(isGameOver(b('XXX.OO...'))).toBe(true)
  })

  it('is true on a draw', () => {
    expect(isGameOver(b('XOXXOOOXX'))).toBe(true)
  })
})

describe('makeMove', () => {
  it('places the player at the index on a new board', () => {
    const board = createBoard()
    const next = makeMove(board, 4, 'X')
    expect(next[4]).toBe('X')
    expect(next.filter((c) => c === null)).toHaveLength(8)
  })

  it('does not mutate the input board', () => {
    const board = createBoard()
    makeMove(board, 0, 'X')
    expect(board).toEqual(createBoard())
  })

  it('throws RangeError for an index below 0', () => {
    expect(() => makeMove(createBoard(), -1, 'X')).toThrow(RangeError)
  })

  it('throws RangeError for an index above 8', () => {
    expect(() => makeMove(createBoard(), 9, 'X')).toThrow(RangeError)
  })

  it('throws when the cell is occupied', () => {
    expect(() => makeMove(b('X........'), 0, 'O')).toThrow(/taken/)
  })

  it('throws when the game is already over', () => {
    expect(() => makeMove(b('XXX.OO...'), 3, 'O')).toThrow(/over/)
  })
})
