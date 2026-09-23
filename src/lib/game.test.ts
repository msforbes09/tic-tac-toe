import { describe, expect, it } from 'vitest'
import { availableMoves, createBoard, nextPlayer } from './game'
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
