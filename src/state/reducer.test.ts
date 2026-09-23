import { describe, expect, it } from 'vitest'
import { createGameState, gameReducer, type GameState } from './reducer'
import type { Settings } from '@/lib/types'

const settings: Settings = { mode: 'pvp', difficulty: 'medium' }

const play = (state: GameState, ...indices: number[]) =>
  indices.reduce((s, index) => gameReducer(s, { type: 'MOVE', index }), state)

describe('createGameState', () => {
  it('starts with an empty board, playing, not recorded', () => {
    const s = createGameState(settings)
    expect(s.board).toEqual(Array(9).fill(null))
    expect(s.status).toBe('playing')
    expect(s.winner).toBeNull()
    expect(s.winningLine).toBeNull()
    expect(s.recorded).toBe(false)
    expect(s.settings).toEqual(settings)
  })
})

describe('MOVE', () => {
  it('places X first, then O', () => {
    const s = play(createGameState(settings), 4, 0)
    expect(s.board[4]).toBe('X')
    expect(s.board[0]).toBe('O')
  })

  it('ignores a move on an occupied cell', () => {
    const s1 = play(createGameState(settings), 4)
    const s2 = gameReducer(s1, { type: 'MOVE', index: 4 })
    expect(s2).toBe(s1)
  })

  it('ignores an out-of-range index', () => {
    const s1 = createGameState(settings)
    expect(gameReducer(s1, { type: 'MOVE', index: 9 })).toBe(s1)
    expect(gameReducer(s1, { type: 'MOVE', index: -1 })).toBe(s1)
  })

  it('sets won, winner and winningLine when a line completes', () => {
    const s = play(createGameState(settings), 0, 3, 1, 4, 2)
    expect(s.status).toBe('won')
    expect(s.winner).toBe('X')
    expect(s.winningLine).toEqual([0, 1, 2])
  })

  it('sets draw when the board fills with no winner', () => {
    const s = play(createGameState(settings), 0, 1, 2, 4, 3, 5, 7, 6, 8)
    expect(s.status).toBe('draw')
    expect(s.winner).toBeNull()
  })

  it('ignores moves after the game is over', () => {
    const won = play(createGameState(settings), 0, 3, 1, 4, 2)
    expect(gameReducer(won, { type: 'MOVE', index: 8 })).toBe(won)
  })
})

describe('NEW_GAME', () => {
  it('resets the board and flags but keeps settings', () => {
    const botSettings: Settings = { mode: 'bot', difficulty: 'hard' }
    let s = play(createGameState(botSettings), 0, 3, 1, 4, 2)
    s = gameReducer(s, { type: 'RECORDED' })
    const fresh = gameReducer(s, { type: 'NEW_GAME' })
    expect(fresh).toEqual(createGameState(botSettings))
  })
})

describe('RECORDED', () => {
  it('flips recorded to true', () => {
    const s = gameReducer(createGameState(settings), { type: 'RECORDED' })
    expect(s.recorded).toBe(true)
  })
})
