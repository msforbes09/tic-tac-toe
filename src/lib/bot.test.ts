import { describe, expect, it } from 'vitest'
import { MAX_THINK_MS, chancesFor, chooseMove, thinkTime } from './bot'
import { availableMoves, createBoard, getWinner, isGameOver, makeMove, nextPlayer } from './game'
import type { Board, Player } from './types'

const b = (s: string): Board =>
  s.split('').map((c) => (c === '.' ? null : (c as 'X' | 'O')))

describe('chancesFor', () => {
  it('anchors rung 1, 11, and 30 on the old easy, medium, and hard', () => {
    expect(chancesFor(1)).toEqual({ win: 0, block: 0, best: 0 })
    expect(chancesFor(11)).toEqual({ win: 1, block: 1, best: 0 })
    expect(chancesFor(30)).toEqual({ win: 1, block: 1, best: 1 })
  })

  it('grows wins and blocks through easy, best moves through medium, and squeezes the rest in hard', () => {
    expect(chancesFor(3)).toEqual({ win: 0.4, block: 0.2, best: 0 })
    expect(chancesFor(10)).toEqual({ win: 1, block: 0.9, best: 0 })
    expect(chancesFor(20).best).toBeCloseTo(0.63)
    expect(chancesFor(21).best).toBeCloseTo(0.75)
    expect(chancesFor(29).best).toBeCloseTo(0.91)
  })

  it('never gets easier as the rung rises', () => {
    for (let r = 2; r <= 30; r++) {
      const lo = chancesFor(r - 1)
      const hi = chancesFor(r)
      expect(hi.win).toBeGreaterThanOrEqual(lo.win)
      expect(hi.block).toBeGreaterThanOrEqual(lo.block)
      expect(hi.best).toBeGreaterThanOrEqual(lo.best)
    }
    expect(chancesFor(29).best).toBeLessThan(1)
  })
})

describe('chooseMove at rung 1 (random)', () => {
  it('picks the first available cell when rng returns 0', () => {
    expect(chooseMove(b('XO.......'), 1, () => 0)).toBe(2)
  })

  it('picks the last available cell when rng is close to 1', () => {
    expect(chooseMove(b('XO.......'), 1, () => 0.999)).toBe(8)
  })

  it('only ever picks empty cells', () => {
    const board = b('X.O.X.O..')
    for (let i = 0; i < 50; i++) {
      expect(availableMoves(board)).toContain(chooseMove(board, 1))
    }
  })

  it('throws on a full board', () => {
    expect(() => chooseMove(b('XOXXOOOXX'), 1)).toThrow(/No moves/)
  })
})

describe('chooseMove at rung 11 (wins and blocks, otherwise random)', () => {
  it('takes an immediate win', () => {
    // O O . / X X . / X . .  -> O to move, wins at 2 (must not merely block at 5)
    expect(chooseMove(b('OO.XX.X..'), 11, () => 0)).toBe(2)
  })

  it('blocks the human when it cannot win', () => {
    // X X . / . O . / . . .  -> O must block at 2
    expect(chooseMove(b('XX..O....'), 11, () => 0)).toBe(2)
  })

  it('prefers winning over blocking', () => {
    // X X . / O O . / . . X  -> O could block at 2 but wins at 5
    expect(chooseMove(b('XX.OO...X'), 11, () => 0)).toBe(5)
  })

  it('falls back to random when nothing is forced', () => {
    // X . . / . O . / . . .  -> nothing to win or block; rng 0 -> first empty = 1
    expect(chooseMove(b('X...O....'), 11, () => 0)).toBe(1)
  })

  it('takes an immediate win as X', () => {
    expect(chooseMove(b('XX.OO....'), 11, () => 0)).toBe(2)
  })

  it('blocks O when playing X', () => {
    expect(chooseMove(b('X..OO.X..'), 11, () => 0)).toBe(5)
  })
})

describe('chooseMove in between', () => {
  it('misses a block when the roll fails, and blocks when it passes', () => {
    // rung 5 blocks 40% of the time. The block roll comes after the (failed) win roll.
    const board = b('XX..O....')
    expect(chooseMove(board, 5, () => 0.9)).not.toBe(2)
    expect(chooseMove(board, 5, () => 0.1)).toBe(2)
  })
})

describe('chooseMove at rung 30 (perfect)', () => {
  it('takes an immediate win over a block', () => {
    expect(chooseMove(b('XX.OO...X'), 30)).toBe(5)
  })

  it('blocks a fork setup: X corners -> O must not take another corner', () => {
    expect([1, 3, 5, 7]).toContain(chooseMove(b('X...O...X'), 30))
  })

  it('takes an immediate win as X', () => {
    expect(chooseMove(b('XX.OO....'), 30)).toBe(2)
  })

  it('varies among equally good moves, but is deterministic for a fixed rng', () => {
    const board = b('X...O....')
    const seen = new Set<number>()
    for (let i = 0; i < 60; i++) seen.add(chooseMove(board, 30))
    expect(seen.size).toBeGreaterThan(1)
    expect(chooseMove(board, 30, () => 0.3)).toBe(chooseMove(board, 30, () => 0.3))
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
        next = makeMove(next, chooseMove(next, 30), 'O')
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

  it('never loses when it opens as X', () => {
    let games = 0
    const explore = (board: Board) => {
      const afterBot = makeMove(board, chooseMove(board, 30), 'X')
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

/** Plays one game between two rungs; the bot at `first` opens as X. Returns the winner's rung or null. */
function playGame(first: number, second: number, rng: () => number): number | null {
  let board = createBoard()
  const rungOf: Record<Player, number> = { X: first, O: second }
  while (!isGameOver(board)) {
    const player = nextPlayer(board)
    board = makeMove(board, chooseMove(board, rungOf[player], rng), player)
  }
  const winner = getWinner(board)
  return winner ? rungOf[winner.player] : null
}

describe('the climb to the top', () => {
  it('a perfect player beats rung 29 sometimes but never loses to it', () => {
    let wins = 0
    let losses = 0
    const games = 2000
    for (let i = 0; i < games; i++) {
      const winner = i % 2 === 0 ? playGame(30, 29, Math.random) : playGame(29, 30, Math.random)
      if (winner === 30) wins++
      if (winner === 29) losses++
    }
    expect(losses).toBe(0)
    expect(wins / games).toBeGreaterThan(0.03)
    expect(wins / games).toBeLessThan(0.2)
  })

  it('a perfect player never beats rung 30', () => {
    for (let i = 0; i < 300; i++) {
      expect(playGame(30, 30, Math.random)).toBeNull()
    }
  })
})

describe('thinkTime', () => {
  const open = b('....X....')
  const forcedWin = b('OO.XX....') // O to move at cell 2 wins
  const forcedBlock = b('XX..O....') // O to move at cell 2 blocks

  it('snaps to a winning or blocking move at every band', () => {
    for (const rung of [1, 15, 30]) {
      expect(thinkTime(forcedWin, rung, 2, () => 1)).toBeLessThanOrEqual(320)
      expect(thinkTime(forcedBlock, rung, 2, () => 1)).toBeLessThanOrEqual(320)
    }
  })

  it('thinks longer the higher the band on the same quiet board', () => {
    const mid = b('X...O.X..')
    const easy = thinkTime(mid, 5, 1, () => 0.5)
    const medium = thinkTime(mid, 15, 1, () => 0.5)
    const hard = thinkTime(mid, 30, 1, () => 0.5)
    expect(easy).toBeLessThan(medium)
    expect(medium).toBeLessThan(hard)
    expect(hard).toBeGreaterThanOrEqual(700)
  })

  it('thinks longer with more empty squares, and answers the opening quickly', () => {
    const openBoard = thinkTime(b('X...O....'), 30, 8, () => 0.5)
    const lateBoard = thinkTime(b('XOX.XO.O.'), 30, 3, () => 0.5)
    const opening = thinkTime(open, 30, 0, () => 0.5)
    expect(lateBoard).toBeLessThan(openBoard)
    expect(opening).toBeLessThan(openBoard)
  })

  it('stays within bounds for every rung and roll', () => {
    for (let rung = 1; rung <= 30; rung++) {
      for (const roll of [0, 0.37, 0.99]) {
        const t = thinkTime(b('X...O....'), rung, 8, () => roll)
        expect(t).toBeGreaterThanOrEqual(150)
        expect(t).toBeLessThanOrEqual(MAX_THINK_MS)
      }
    }
  })
})
