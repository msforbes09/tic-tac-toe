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

describe('chooseMove hard', () => {
  it('takes an immediate win over a block', () => {
    // X X . / O O . / . . X -> O to move; winning at 5 beats blocking at 2
    expect(chooseMove(b('XX.OO...X'), 'hard')).toBe(5)
  })

  it('blocks a fork setup: X corners -> O must not take another corner', () => {
    // X . . / . O . / . . X  -> the only non-losing replies are edges (1,3,5,7)
    expect([1, 3, 5, 7]).toContain(chooseMove(b('X...O...X'), 'hard'))
  })

  it('is deterministic', () => {
    const board = b('X...O....')
    expect(chooseMove(board, 'hard')).toBe(chooseMove(board, 'hard'))
  })

  it('never loses against every possible human line of play', () => {
    let games = 0
    const explore = (board: Board) => {
      for (const h of availableMoves(board)) {
        let next = makeMove(board, h, 'X')
        if (isGameOver(next)) {
          games++
          expect(getWinner(next)?.player).not.toBe('X')
          continue
        }
        next = makeMove(next, chooseMove(next, 'hard'), 'O')
        if (isGameOver(next)) {
          games++
          continue
        }
        explore(next)
      }
    }
    explore(createBoard())
    expect(games).toBeGreaterThan(100)
  })
})

describe('the bot plays whichever side is to move', () => {
  it('medium takes an immediate win as X', () => {
    // X X . / O O . / . . .  -> X to move, wins at 2
    expect(chooseMove(b('XX.OO....'), 'medium', () => 0)).toBe(2)
  })

  it('medium blocks O when playing X', () => {
    // X . . / O O . / X . .  -> X to move, must block at 5
    expect(chooseMove(b('X..OO.X..'), 'medium', () => 0)).toBe(5)
  })

  it('hard takes an immediate win as X', () => {
    expect(chooseMove(b('XX.OO....'), 'hard')).toBe(2)
  })

  it('hard never loses when it opens as X', () => {
    let games = 0
    const explore = (board: Board) => {
      // Bot (X) moves, then every possible human (O) reply.
      const afterBot = makeMove(board, chooseMove(board, 'hard'), 'X')
      if (isGameOver(afterBot)) {
        games++
        return
      }
      for (const h of availableMoves(afterBot)) {
        const next = makeMove(afterBot, h, 'O')
        if (isGameOver(next)) {
          games++
          expect(getWinner(next)?.player).not.toBe('O')
          continue
        }
        explore(next)
      }
    }
    explore(createBoard())
    expect(games).toBeGreaterThan(10)
  })
})
