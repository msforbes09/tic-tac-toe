import { describe, expect, it } from 'vitest'
import { canSeatMove, createGameState, gameReducer, snapshotOf, type GameState } from './reducer'
import type { Settings } from '@/lib/types'
import type { Snapshot } from '@/lib/room'

const settings: Settings = { mode: 'pvp', difficulty: 'medium', p1Symbol: 'X' }

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
    const botSettings: Settings = { mode: 'bot', difficulty: 'hard', p1Symbol: 'X' }
    let s = play(createGameState(botSettings), 0, 3, 1, 4, 2)
    s = gameReducer(s, { type: 'RECORDED' })
    const fresh = gameReducer(s, { type: 'NEW_GAME' })
    expect(fresh.board).toEqual(Array(9).fill(null))
    expect(fresh.status).toBe('playing')
    expect(fresh.winner).toBeNull()
    expect(fresh.winningLine).toBeNull()
    expect(fresh.recorded).toBe(false)
    expect(fresh.settings).toEqual(botSettings)
  })
})

describe('seats', () => {
  it('starts player one on the symbol chosen in settings', () => {
    expect(createGameState({ ...settings, p1Symbol: 'O' }).p1Symbol).toBe('O')
    expect(createGameState(settings).p1Symbol).toBe('X')
  })

  it('gives X to the winner for the next game', () => {
    // Player one is X; O (player two) wins down the middle column.
    const won = play(createGameState(settings), 0, 1, 3, 4, 8, 7)
    expect(won.winner).toBe('O')
    expect(gameReducer(won, { type: 'NEW_GAME' }).p1Symbol).toBe('O')
  })

  it('keeps X with a winner who already had it', () => {
    const won = play(createGameState(settings), 0, 3, 1, 4, 2)
    expect(gameReducer(won, { type: 'NEW_GAME' }).p1Symbol).toBe('X')
  })

  it('swaps symbols after a draw', () => {
    const draw = play(createGameState(settings), 0, 1, 2, 4, 3, 5, 7, 6, 8)
    expect(draw.status).toBe('draw')
    expect(gameReducer(draw, { type: 'NEW_GAME' }).p1Symbol).toBe('O')
  })

  it('keeps symbols when a game is abandoned mid-way', () => {
    const midway = play(createGameState(settings), 0, 1)
    expect(gameReducer(midway, { type: 'NEW_GAME' }).p1Symbol).toBe('X')
  })
})

describe('score', () => {
  it('starts at zero', () => {
    expect(createGameState(settings).score).toEqual({ p1: 0, p2: 0, draws: 0 })
  })

  it('credits the winning seat, not the symbol', () => {
    let s = play(createGameState({ ...settings, p1Symbol: 'O' }), 0, 3, 1, 4, 2)
    expect(s.winner).toBe('X')
    expect(s.score).toEqual({ p1: 0, p2: 1, draws: 0 })
    s = gameReducer(s, { type: 'NEW_GAME' })
    // Player two won, so they are X again and X wins again.
    s = play(s, 0, 3, 1, 4, 2)
    expect(s.score).toEqual({ p1: 0, p2: 2, draws: 0 })
  })

  it('counts draws and carries the score across new games', () => {
    let s = play(createGameState(settings), 0, 1, 2, 4, 3, 5, 7, 6, 8)
    expect(s.score).toEqual({ p1: 0, p2: 0, draws: 1 })
    s = gameReducer(s, { type: 'NEW_GAME' })
    expect(s.score).toEqual({ p1: 0, p2: 0, draws: 1 })
  })

  it('does not change when a game is abandoned', () => {
    const s = gameReducer(play(createGameState(settings), 0, 1), { type: 'NEW_GAME' })
    expect(s.score).toEqual({ p1: 0, p2: 0, draws: 0 })
  })
})

describe('RECORDED', () => {
  it('flips recorded to true', () => {
    const s = gameReducer(createGameState(settings), { type: 'RECORDED' })
    expect(s.recorded).toBe(true)
  })
})

describe('online sync', () => {
  const online: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }

  it('snapshotOf carries exactly the shared fields', () => {
    const state = gameReducer(createGameState(online), { type: 'MOVE', index: 4 })
    expect(snapshotOf(state)).toEqual({
      board: [null, null, null, null, 'X', null, null, null, null],
      p1Symbol: 'X',
      score: { p1: 0, p2: 0, draws: 0 },
      status: 'playing',
      winner: null,
      winningLine: null,
    })
    expect(snapshotOf(state)).not.toHaveProperty('settings')
    expect(snapshotOf(state)).not.toHaveProperty('recorded')
  })

  it('SYNC replaces the shared fields and keeps settings', () => {
    const host = gameReducer(createGameState(online), { type: 'MOVE', index: 0 })
    const guest = gameReducer(createGameState(online), { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(guest.board).toEqual(host.board)
    expect(guest.settings).toEqual(online)
    expect(guest.recorded).toBe(false)
  })

  it('SYNC of a changed board clears recorded; the same snapshot again keeps it', () => {
    let host = createGameState(online)
    for (const i of [0, 3, 1, 4, 2]) host = gameReducer(host, { type: 'MOVE', index: i })
    expect(host.status).toBe('won')
    const midGame = gameReducer(createGameState(online), { type: 'MOVE', index: 0 })
    let guest = gameReducer(createGameState(online), { type: 'SYNC', snapshot: snapshotOf(midGame) })
    guest = gameReducer(guest, { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(guest.recorded).toBe(false)
    guest = gameReducer(guest, { type: 'RECORDED' })
    guest = gameReducer(guest, { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(guest.recorded).toBe(true)
    const next = gameReducer(host, { type: 'NEW_GAME' })
    guest = gameReducer(guest, { type: 'SYNC', snapshot: snapshotOf(next) })
    expect(guest.recorded).toBe(false)
    expect(guest.p1Symbol).toBe('X')
  })

  it('canSeatMove says whose turn it is and nothing when the game is over', () => {
    let state = createGameState(online)
    expect(canSeatMove(state, 'p1')).toBe(true)
    expect(canSeatMove(state, 'p2')).toBe(false)
    state = gameReducer(state, { type: 'MOVE', index: 0 })
    expect(canSeatMove(state, 'p1')).toBe(false)
    expect(canSeatMove(state, 'p2')).toBe(true)
    for (const i of [3, 1, 4, 2]) state = gameReducer(state, { type: 'MOVE', index: i })
    expect(canSeatMove(state, 'p1')).toBe(false)
    expect(canSeatMove(state, 'p2')).toBe(false)
  })

  it('SYNC takes only the shared fields, whatever else came over the wire', () => {
    const host = gameReducer(createGameState(online), { type: 'MOVE', index: 0 })
    const wire = { ...snapshotOf(host), settings: { mode: 'bot', difficulty: 'zzz' }, recorded: true } as unknown as Snapshot
    const guest = gameReducer(createGameState(online), { type: 'SYNC', snapshot: wire })
    expect(guest.settings).toEqual(online)
    expect(guest.recorded).toBe(false)
    expect(Object.keys(guest).sort()).toEqual(Object.keys(createGameState(online)).sort())
  })

  it('a finished game synced onto an untouched board was not watched, so it counts as recorded', () => {
    let host = createGameState(online)
    for (const i of [0, 3, 1, 4, 2]) host = gameReducer(host, { type: 'MOVE', index: i })
    const late = gameReducer(createGameState(online), { type: 'SYNC', snapshot: snapshotOf(host) })
    expect(late.status).toBe('won')
    expect(late.recorded).toBe(true)
    const next = gameReducer(late, { type: 'SYNC', snapshot: snapshotOf(gameReducer(host, { type: 'NEW_GAME' })) })
    expect(next.recorded).toBe(false)
  })
})
