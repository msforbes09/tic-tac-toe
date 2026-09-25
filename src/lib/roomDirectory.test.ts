import type { GameRow } from './history'
import { EMPTY_STATE } from './achievements'
import { EMPTY_LADDER } from './ladder'
import { describe, expect, it, vi } from 'vitest'
import { PLAYERS_PAGE, createFakeDirectory } from './roomDirectory'
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

  it('stores games once by id and lists a player\'s games by mode, newest first, capped', async () => {
    const dir = createFakeDirectory(hash)
    const row = (id: string, playedAt: number, mode: GameRow['mode'] = 'bot'): GameRow => ({
      id, playerId: 'dev', mode, difficulty: mode === 'bot' ? 'hard' : null, rung: mode === 'bot' ? 9 : null, outcome: 'won', symbol: 'X', playedAt,
    })
    await dir.addGames([row('g1', 1), row('g2', 2), row('g3', 3, 'pvp')])
    await dir.addGames([row('g1', 1)])
    expect((await dir.listGames('dev', 'bot')).map((g) => g.id)).toEqual(['g2', 'g1'])
    expect((await dir.listGames('dev', 'pvp')).map((g) => g.id)).toEqual(['g3'])
    expect((await dir.listGames('dev', 'bot', 1)).map((g) => g.id)).toEqual(['g2'])
    expect(await dir.listGames('other', 'bot')).toEqual([])
  })

  it('resets a player’s games and ladder behind the token, leaving other players and series alone', async () => {
    const dir = createFakeDirectory(hash)
    const row = (id: string, playerId: string): GameRow => ({
      id, playerId, mode: 'bot', difficulty: 'hard', rung: 9, outcome: 'won', symbol: 'X', playedAt: 1,
    })
    await dir.addGames([row('g1', 'dev'), row('g2', 'dev'), row('g3', 'other')])
    await dir.saveLadder('dev', 't', { ...EMPTY_LADDER, rung: 12, updatedAt: 100 })
    await dir.saveLadder('other', 'o', { ...EMPTY_LADDER, rung: 3, updatedAt: 100 })
    expect(await dir.resetPlayerData('dev', 'wrong')).toBe(false)
    expect((await dir.listGames('dev', 'bot')).length).toBe(2)
    expect(await dir.resetPlayerData('dev', 't')).toBe(true)
    expect(await dir.listGames('dev', 'bot')).toEqual([])
    expect(await dir.loadLadder('dev')).toBeNull()
    expect((await dir.listGames('other', 'bot')).length).toBe(1)
    expect((await dir.loadLadder('other'))?.rung).toBe(3)
    // Nothing to protect and nothing to delete: not an error, just false.
    expect(await dir.resetPlayerData('nobody', 'x')).toBe(false)
  })

  it('saves a ladder per player behind the token and loads it back', async () => {
    const dir = createFakeDirectory(hash)
    expect(await dir.loadLadder('dev')).toBeNull()
    await dir.saveLadder('dev', 't', { ...EMPTY_LADDER, rung: 12, updatedAt: 100 })
    expect(await dir.loadLadder('dev')).toEqual({ playerId: 'dev', ...EMPTY_LADDER, rung: 12, updatedAt: 100 })
    await dir.saveLadder('dev', 't', { ...EMPTY_LADDER, rung: 13, updatedAt: 200 })
    expect((await dir.loadLadder('dev'))?.rung).toBe(13)
    await expect(dir.saveLadder('dev', 'wrong', { ...EMPTY_LADDER, rung: 1, updatedAt: 300 })).rejects.toThrow()
    expect((await dir.loadLadder('dev'))?.rung).toBe(13)
  })

  it('loads a player by id, or null', async () => {
    const dir = createFakeDirectory(hash)
    expect(await dir.loadPlayer('d1')).toBeNull()
    await dir.savePlayer({ id: 'd1', nickname: 'Ann' }, 't1')
    expect(await dir.loadPlayer('d1')).toEqual({ id: 'd1', nickname: 'Ann' })
  })

  it('lists players most recently seen first, a page at a time', async () => {
    const dir = createFakeDirectory(hash)
    const now = vi.spyOn(Date, 'now')
    for (let i = 0; i < PLAYERS_PAGE + 2; i++) {
      // Two players share each timestamp, so the id breaks the tie.
      now.mockReturnValue(1000 + Math.floor(i / 2))
      await dir.savePlayer({ id: `p${String(i).padStart(3, '0')}`, nickname: `N${i}` }, `t${i}`)
    }
    now.mockReturnValue(5000)
    await dir.savePlayer({ id: 'p000', nickname: 'Back' }, 't0')
    now.mockRestore()

    const first = await dir.listPlayers()
    expect(first.players).toHaveLength(PLAYERS_PAGE)
    expect(first.players[0]).toEqual({ id: 'p000', nickname: 'Back', lastSeenAt: 5000 })
    expect(first.players.slice(1, 3).map((p) => p.id)).toEqual(['p051', 'p050'])
    expect(first.next).not.toBeNull()

    const second = await dir.listPlayers(first.next)
    expect(second.players.map((p) => p.id)).toEqual(['p002', 'p001'])
    expect(second.next).toBeNull()
  })

  it('stores achievements per player behind the token, newest updatedAt wins, and reset removes them', async () => {
    const dir = createFakeDirectory(hash)
    const state = { ...EMPTY_STATE, unlocks: { 'hello-bot': 1 }, updatedAt: 5 }
    expect(await dir.loadAchievements('d1')).toBeNull()
    await dir.saveAchievements('d1', 't1', state)
    expect(await dir.loadAchievements('d1')).toEqual(state)
    await expect(dir.saveAchievements('d1', 'wrong', { ...state, updatedAt: 9 })).rejects.toThrow()
    await dir.saveAchievements('d1', 't1', { ...state, updatedAt: 3 })
    expect((await dir.loadAchievements('d1'))?.updatedAt).toBe(5)
    expect(await dir.resetPlayerData('d1', 't1')).toBe(true)
    expect(await dir.loadAchievements('d1')).toBeNull()
  })
})
