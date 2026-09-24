import { describe, expect, it } from 'vitest'
import { onlineReducer, resolveRole } from './online'
import { snapshotOfSeries, startSeries } from './series'
import type { GamePresence } from '@/lib/room'

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const fresh = () => startSeries('r', 'g', alice, bob)

describe('onlineReducer referee', () => {
  const ref = onlineReducer('referee')

  it('applies opponent moves by id and drops out-of-turn ones', () => {
    const s = ref(fresh(), { type: 'GAME_MESSAGE', message: { type: 'move', index: 0, from: 'b' } })
    expect(s.game.board[0]).toBe('X')
    expect(ref(s, { type: 'GAME_MESSAGE', message: { type: 'move', index: 1, from: 'b' } })).toBe(s)
    const t = ref(s, { type: 'MOVE', index: 1, by: 'a' })
    expect(t.game.board[1]).toBe('O')
  })

  it('handles resign and next-game requests, ignores hello and state', () => {
    const s = ref(fresh(), { type: 'GAME_MESSAGE', message: { type: 'resign', from: 'b' } })
    expect(s.result?.loser).toEqual(bob)
    expect(s.result?.reason).toBe('resigned')
    const f = fresh()
    expect(ref(f, { type: 'GAME_MESSAGE', message: { type: 'hello', from: 'b' } })).toBe(f)
    expect(ref(f, { type: 'GAME_MESSAGE', message: { type: 'state', state: snapshotOfSeries(s) } })).toBe(f)
    expect(ref(f, { type: 'GAME_MESSAGE', message: { type: 'next-game', from: 'b' } })).toBe(f)
  })
})

describe('onlineReducer player and watcher', () => {
  it('only sync from state messages; local moves are requests, not changes', () => {
    const player = onlineReducer('player')
    const watcher = onlineReducer('watcher')
    const truth = onlineReducer('referee')(fresh(), { type: 'GAME_MESSAGE', message: { type: 'move', index: 4, from: 'b' } })
    const msg = { type: 'GAME_MESSAGE', message: { type: 'state', state: snapshotOfSeries(truth) } } as const
    expect(player(fresh(), msg).game.board[4]).toBe('X')
    expect(watcher(fresh(), msg).game.board[4]).toBe('X')
    const f = fresh()
    expect(player(f, { type: 'MOVE', index: 0, by: 'b' })).toBe(f)
    expect(player(f, { type: 'NEXT_GAME' })).toBe(f)
    expect(player(f, { type: 'RESIGN', by: 'b', reason: 'resigned', at: 1 })).toBe(f)
    expect(watcher(f, { type: 'GAME_MESSAGE', message: { type: 'move', index: 0, from: 'b' } })).toBe(f)
    expect(player(f, { type: 'GAME_MESSAGE', message: { type: 'state', state: { nope: true } } })).toBe(f)
    expect(player(f, { type: 'RECORDED' }).game.recorded).toBe(true)
  })
})

describe('resolveRole', () => {
  it('lets the lower id keep referee when two claim it', () => {
    const members: GamePresence[] = [
      { deviceId: 'a', role: 'referee' },
      { deviceId: 'b', role: 'referee' },
    ]
    expect(resolveRole('a', 'referee', members)).toBe('referee')
    expect(resolveRole('b', 'referee', members)).toBe('player')
    expect(resolveRole('b', 'player', members)).toBe('player')
    expect(resolveRole('c', 'watcher', members)).toBe('watcher')
    expect(resolveRole('a', 'referee', [{ deviceId: 'a', role: 'referee' }])).toBe('referee')
  })
})
