import { describe, expect, it, vi } from 'vitest'
import { createFakeDirectory } from './roomDirectory'
import type { SeriesResult } from './room'

const hash = async (t: string) => `h:${t}`
const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const result = (gameId: string, endedAt = 10): SeriesResult => ({
  gameId,
  roomId: 'r1',
  challengerId: 'a',
  challengedId: 'b',
  winner: alice,
  loser: bob,
  winnerScore: 6,
  loserScore: 2,
  games: 8,
  reason: 'decided',
  endedAt,
})

describe('fake room directory', () => {
  it('creates, lists (newest first) and notifies', async () => {
    const dir = createFakeDirectory(hash)
    const seen = vi.fn()
    dir.onRoomsChange(seen)
    expect(seen).toHaveBeenLastCalledWith([])
    const r1 = await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    expect(r1).toEqual({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', createdAt: expect.any(Number) })
    await dir.createRoom({ id: 'r2', name: 'Bold Corner', creatorId: 'b', ownerHash: await hash('t2') })
    expect((await dir.listRooms()).map((r) => r.id)).toEqual(['r2', 'r1'])
    expect(seen).toHaveBeenCalledTimes(3)
  })

  it('deletes only with the right token, cascading results', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    await dir.addResult(result('g1'))
    expect(await dir.deleteRoom('r1', 'wrong')).toBe(false)
    expect(await dir.deleteRoom('r1', 't1')).toBe(true)
    expect(await dir.listRooms()).toEqual([])
    expect(await dir.listResults('r1')).toEqual([])
    expect(await dir.deleteRoom('r1', 't1')).toBe(false)
  })

  it('lists results newest first, once per gameId, and notifies the room', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    const seen = vi.fn()
    dir.onResultsChange('r1', seen)
    expect(seen).toHaveBeenLastCalledWith([])
    await dir.addResult(result('g1'))
    await dir.addResult(result('g2', 20))
    await dir.addResult(result('g1'))
    expect((await dir.listResults('r1')).map((r) => r.gameId)).toEqual(['g2', 'g1'])
    expect(seen).toHaveBeenCalledTimes(3)
  })

  it('stops notifying after unsubscribe', async () => {
    const dir = createFakeDirectory(hash)
    const seen = vi.fn()
    const off = dir.onRoomsChange(seen)
    off()
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    expect(seen).toHaveBeenCalledTimes(1)
  })

  it('saves a player once per id and lets only the same token rename it', async () => {
    const dir = createFakeDirectory(hash)
    await dir.savePlayer({ id: 'a', nickname: 'Alice' }, 't-a')
    await dir.savePlayer({ id: 'a', nickname: 'Ally' }, 't-a')
    expect(dir.players()).toEqual([{ id: 'a', nickname: 'Ally' }])
    await expect(dir.savePlayer({ id: 'a', nickname: 'Mallory' }, 'wrong')).rejects.toThrow()
    expect(dir.players()).toEqual([{ id: 'a', nickname: 'Ally' }])
  })

  it('lists my results across rooms, newest first, and notifies on change', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r1', name: 'Sly Diagonal', creatorId: 'a', ownerHash: await hash('t1') })
    await dir.createRoom({ id: 'r2', name: 'Bold Corner', creatorId: 'z', ownerHash: await hash('t2') })
    const seen = vi.fn()
    dir.onMyResultsChange('b', seen)
    await dir.addResult(result('g1', 10))
    await dir.addResult({ ...result('g2', 20), roomId: 'r2' })
    await dir.addResult({ ...result('g3', 30), winner: { deviceId: 'z', nickname: 'Zed' }, loser: { deviceId: 'y', nickname: 'Yan' }, challengerId: 'z', challengedId: 'y' })
    expect((await dir.listMyResults('b')).map((r) => r.gameId)).toEqual(['g2', 'g1'])
    expect((await dir.listMyResults('a')).map((r) => r.gameId)).toEqual(['g2', 'g1'])
    expect(await dir.listMyResults('q')).toEqual([])
    expect(seen).toHaveBeenCalledTimes(3)
  })
})
