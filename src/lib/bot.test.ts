import { describe, expect, it } from 'vitest'
import { chooseMove } from './bot'
import { availableMoves, createBoard, getWinner, isGameOver, makeMove } from './game'
import type { Board } from './types'

const b = (s: string): Board =>
  s.split('').map((c) => (c === '.' ? null : (c as 'X' | 'O')))

describe('chooseMove easy', () => {
  it('picks the first available cell when rng returns 0', () => {
    expect(chooseMove(b('XO.......'), 'easy', () => 0)).toBe(2)
  })

  it('picks the last available cell when rng is close to 1', () => {
    expect(chooseMove(b('XO.......'), 'easy', () => 0.999)).toBe(8)
  })

  it('only ever picks empty cells', () => {
    const board = b('X.O.X.O..')
    for (let i = 0; i < 50; i++) {
      expect(availableMoves(board)).toContain(chooseMove(board, 'easy'))
    }
  })

  it('throws on a full board', () => {
    expect(() => chooseMove(b('XOXXOOOXX'), 'easy')).toThrow(/No moves/)
  })
})

describe('chooseMove medium', () => {
  it('takes an immediate win', () => {
    // O O . / X X . / X . .  -> O to move, wins at 2 (must not merely block at 5)
    expect(chooseMove(b('OO.XX.X..'), 'medium', () => 0)).toBe(2)
  })

  it('blocks the human when it cannot win', () => {
    // X X . / . O . / . . .  -> O must block at 2
    expect(chooseMove(b('XX..O....'), 'medium', () => 0)).toBe(2)
  })

  it('prefers winning over blocking', () => {
    // X X . / O O . / . . X  -> O could block at 2 but wins at 5
    expect(chooseMove(b('XX.OO...X'), 'medium', () => 0)).toBe(5)
  })

  it('falls back to random when nothing is forced', () => {
    // X . . / . O . / . . .  -> nothing to win or block; rng 0 -> first empty = 1
    expect(chooseMove(b('X...O....'), 'medium', () => 0)).toBe(1)
  })
})
