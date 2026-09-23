import { describe, expect, it } from 'vitest'
import { feedbackForChange } from './feedback'
import type { Board } from './types'

const b = (s: string): Board => s.split('').map((c) => (c === '.' ? null : (c as 'X' | 'O')))

describe('feedbackForChange', () => {
  it('reports a move by X', () => {
    expect(feedbackForChange(b('.........'), b('X........'))).toEqual({ kind: 'move', player: 'X' })
  })

  it('reports a move by O', () => {
    expect(feedbackForChange(b('X........'), b('XO.......'))).toEqual({ kind: 'move', player: 'O' })
  })

  it('reports a win instead of a move when the move completes a line', () => {
    expect(feedbackForChange(b('XX.OO....'), b('XXXOO....'))).toEqual({ kind: 'win', player: 'X' })
  })

  it('reports a draw when the last move fills the board without a winner', () => {
    expect(feedbackForChange(b('XOXXOOOX.'), b('XOXXOOOXX'))).toEqual({ kind: 'draw' })
  })

  it('reports nothing when the board is unchanged', () => {
    const board = b('X........')
    expect(feedbackForChange(board, board)).toBeNull()
  })

  it('reports nothing when the board is reset for a new game', () => {
    expect(feedbackForChange(b('XX.OO....'), b('.........'))).toBeNull()
  })
})
