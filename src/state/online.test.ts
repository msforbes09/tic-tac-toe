import { describe, expect, it } from 'vitest'
import { roomReducer } from './online'
import { createGameState, gameReducer, snapshotOf } from './reducer'
import type { Settings } from '@/lib/types'

const settings: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }
const fresh = () => createGameState(settings)

describe('roomReducer host', () => {
  const host = roomReducer('host')

  it('plays its own moves on its turn only', () => {
    const s = host(fresh(), { type: 'MOVE', index: 0 })
    expect(s.board[0]).toBe('X')
    const again = host(s, { type: 'MOVE', index: 1 })
    expect(again).toBe(s)
  })

  it("applies a guest move on the guest's turn and drops it otherwise", () => {
    const early = host(fresh(), { type: 'ROOM_MESSAGE', message: { type: 'move', index: 4 } })
    expect(early.board.every((c) => c === null)).toBe(true)
    const afterHost = host(fresh(), { type: 'MOVE', index: 0 })
    const applied = host(afterHost, { type: 'ROOM_MESSAGE', message: { type: 'move', index: 4 } })
    expect(applied.board[4]).toBe('O')
    const taken = host(applied, { type: 'ROOM_MESSAGE', message: { type: 'move', index: 0 } })
    expect(taken).toBe(applied)
  })

  it('a hello changes nothing (the screen answers it with state)', () => {
    const s = host(fresh(), { type: 'MOVE', index: 0 })
    expect(host(s, { type: 'ROOM_MESSAGE', message: { type: 'hello' } })).toBe(s)
    expect(roomReducer('guest')(s, { type: 'ROOM_MESSAGE', message: { type: 'hello' } })).toBe(s)
  })

  it('starts a new game on request and ignores state messages', () => {
    const s = host(fresh(), { type: 'MOVE', index: 0 })
    const next = host(s, { type: 'ROOM_MESSAGE', message: { type: 'new-game' } })
    expect(next.board.every((c) => c === null)).toBe(true)
    const other = gameReducer(fresh(), { type: 'MOVE', index: 8 })
    expect(host(s, { type: 'ROOM_MESSAGE', message: { type: 'state', state: snapshotOf(other) } })).toBe(s)
  })
})

describe('roomReducer guest', () => {
  const guest = roomReducer('guest')

  it('never changes its board from local moves or new game', () => {
    const s = fresh()
    expect(guest(s, { type: 'MOVE', index: 0 })).toBe(s)
    expect(guest(s, { type: 'NEW_GAME' })).toBe(s)
  })

  it('applies host state and ignores requests', () => {
    const hostState = gameReducer(fresh(), { type: 'MOVE', index: 0 })
    const synced = guest(fresh(), { type: 'ROOM_MESSAGE', message: { type: 'state', state: snapshotOf(hostState) } })
    expect(synced.board).toEqual(hostState.board)
    expect(guest(synced, { type: 'ROOM_MESSAGE', message: { type: 'move', index: 4 } })).toBe(synced)
    expect(guest(synced, { type: 'ROOM_MESSAGE', message: { type: 'new-game' } })).toBe(synced)
  })

  it('still records', () => {
    expect(guest(fresh(), { type: 'RECORDED' }).recorded).toBe(true)
  })
})

describe('roomReducer offline', () => {
  it('is the plain game reducer and ignores room messages', () => {
    const local = roomReducer(null)
    const s = local(fresh(), { type: 'MOVE', index: 0 })
    const t = local(s, { type: 'MOVE', index: 1 })
    expect(t.board.slice(0, 2)).toEqual(['X', 'O'])
    expect(local(t, { type: 'ROOM_MESSAGE', message: { type: 'new-game' } })).toBe(t)
  })
})
