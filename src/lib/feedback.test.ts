import { describe, expect, it } from 'vitest'
import { feedbackForChange } from './feedback'
import { createBoard, makeMove } from './game'
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

  it('reports a loss instead of a win when the bot completes a line', () => {
    expect(feedbackForChange(b('XX.OO....'), b('XXXOO....'), 'X')).toEqual({ kind: 'lose' })
  })

  it('still reports a win when you beat the bot', () => {
    expect(feedbackForChange(b('XX.OO....'), b('XXXOO....'), 'O')).toEqual({ kind: 'win', player: 'X' })
  })

  it('reports nothing when the board is unchanged', () => {
    const board = b('X........')
    expect(feedbackForChange(board, board)).toBeNull()
  })

  it('reports a start when the board is reset for a new game', () => {
    expect(feedbackForChange(b('XX.OO....'), b('.........'))).toEqual({ kind: 'start' })
  })

  it('marks the start of a game: first board, or a board wiped for a new game', () => {
    const empty = createBoard()
    expect(feedbackForChange(null, empty)).toEqual({ kind: 'start' })
    const played = makeMove(makeMove(empty, 0, 'X'), 4, 'O')
    expect(feedbackForChange(played, empty)).toEqual({ kind: 'start' })
    expect(feedbackForChange(empty, empty)).toBeNull()
  })

  it("treats the opponent's win as a loss online too", () => {
    const board = makeMove(makeMove(makeMove(makeMove(makeMove(createBoard(), 0, 'X'), 3, 'O'), 1, 'X'), 4, 'O'), 2, 'X')
    const prev = makeMove(makeMove(makeMove(makeMove(createBoard(), 0, 'X'), 3, 'O'), 1, 'X'), 4, 'O')
    expect(feedbackForChange(prev, board, 'X')).toEqual({ kind: 'lose' })
  })
})
