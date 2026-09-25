import type { AchievementState } from './achievements'
import type { GameRow } from './history'
import type { Ladder } from './ladder'
import type { SeriesResult } from './room'
import type { Mode } from './types'

export type RoomRecord = { id: string; name: string; creatorId: string; createdAt: number }
export type PlayerRecord = { id: string; nickname: string }
export type CloudLadder = Ladder & { playerId: string }

/** Persistent rooms and series results. Newest first everywhere. */
export type RoomDirectory = {
  listRooms(): Promise<RoomRecord[]>
  /** Calls the handler with the current list right away, then on every change. */
  onRoomsChange(handler: (rooms: RoomRecord[]) => void): () => void
  createRoom(room: { id: string; name: string; creatorId: string; ownerHash: string }): Promise<RoomRecord>
  /** True when the token matched and the room (with its results) is gone. */
  deleteRoom(id: string, token: string): Promise<boolean>
  listResults(roomId: string): Promise<SeriesResult[]>
  onResultsChange(roomId: string, handler: (results: SeriesResult[]) => void): () => void
  /** Idempotent by gameId. */
  addResult(result: SeriesResult): Promise<void>
  /** Insert or rename this device's player; the token must match the one it was created with. */
  savePlayer(player: PlayerRecord, token: string): Promise<void>
  /** This device's player row, or null when it has none (never registered, or the cloud was wiped). */
  loadPlayer(playerId: string): Promise<PlayerRecord | null>
  loadAchievements(playerId: string): Promise<AchievementState | null>
  /** Insert or update the player's achievements; the token must match; an older updatedAt is ignored. */
  saveAchievements(playerId: string, token: string, state: AchievementState): Promise<void>
  /** Every series this player won or lost, across rooms, newest first. */
  listMyResults(playerId: string): Promise<SeriesResult[]>
  onMyResultsChange(playerId: string, handler: (results: SeriesResult[]) => void): () => void
  /** Finished two-player and bot games. Idempotent by id, so an offline backlog can be replayed. */
  addGames(rows: GameRow[]): Promise<void>
  /** A player's games in one mode, newest first, at most `limit` (default 50). */
  listGames(playerId: string, mode: Mode, limit?: number): Promise<GameRow[]>
  loadLadder(playerId: string): Promise<CloudLadder | null>
  /** Insert or update the player's ladder; the token must match the one it was created with. */
  saveLadder(playerId: string, token: string, ladder: Ladder): Promise<void>
  /**
   * Developer reset: deletes the player's games, ladder, and achievements when the token matches the ladder's
   * (or the player row's). Series results and rooms are shared with other players and stay.
   * True when the token matched and rows were removed.
   */
  resetPlayerData(playerId: string, token: string): Promise<boolean>
}

type StoredRoom = RoomRecord & { ownerHash: string }

/** In-memory directory for tests. `hash` must match what callers used for `ownerHash`. */
export function createFakeDirectory(
  hash: (token: string) => Promise<string>,
): RoomDirectory & { rooms(): RoomRecord[]; players(): PlayerRecord[] } {
  const rooms: StoredRoom[] = []
  const results: SeriesResult[] = []
  const roomHandlers = new Set<(rooms: RoomRecord[]) => void>()
  const resultHandlers = new Map<string, Set<(results: SeriesResult[]) => void>>()
  const myHandlers = new Map<string, Set<(results: SeriesResult[]) => void>>()
  const players: (PlayerRecord & { tokenHash: string })[] = []
  const games: GameRow[] = []
  const ladders = new Map<string, { ladder: Ladder; tokenHash: string }>()
  const achievements = new Map<string, { state: AchievementState; tokenHash: string }>()
  let clock = 1

  const publicRooms = (): RoomRecord[] =>
    [...rooms].sort((a, b) => b.createdAt - a.createdAt).map(({ ownerHash: _h, ...r }) => r)
  const resultsOf = (roomId: string): SeriesResult[] =>
    results.filter((r) => r.roomId === roomId).sort((a, b) => b.endedAt - a.endedAt)
  const announceRooms = () => {
    const list = publicRooms()
    for (const h of roomHandlers) h(list)
  }
  const mine = (playerId: string): SeriesResult[] =>
    results.filter((r) => r.winner.deviceId === playerId || r.loser.deviceId === playerId).sort((a, b) => b.endedAt - a.endedAt)
  /** Room listeners hear about their room; a player hears only about series they took part in. */
  const announceResults = (roomId: string, involved: string[] | null) => {
    const list = resultsOf(roomId)
    for (const h of resultHandlers.get(roomId) ?? []) h(list)
    for (const [playerId, set] of myHandlers) {
      if (involved && !involved.includes(playerId)) continue
      for (const h of set) h(mine(playerId))
    }
  }

  return {
    rooms: publicRooms,
    players: () => players.map(({ id, nickname }) => ({ id, nickname })),
    async savePlayer(player, token) {
      const tokenHash = await hash(token)
      const existing = players.find((p) => p.id === player.id)
      if (!existing) {
        players.push({ ...player, tokenHash })
      } else if (existing.tokenHash === tokenHash) {
        existing.nickname = player.nickname
      } else {
        throw new Error('player token does not match')
      }
    },
    async loadPlayer(playerId) {
      const p = players.find((x) => x.id === playerId)
      return p ? { id: p.id, nickname: p.nickname } : null
    },
    async loadAchievements(playerId) {
      const entry = achievements.get(playerId)
      return entry ? { ...entry.state } : null
    },
    async saveAchievements(playerId, token, state) {
      const tokenHash = await hash(token)
      const existing = achievements.get(playerId)
      if (existing && existing.tokenHash !== tokenHash) throw new Error('achievements token does not match')
      if (existing && existing.state.updatedAt > state.updatedAt) return
      achievements.set(playerId, { state: { ...state }, tokenHash })
    },
    async listMyResults(playerId) {
      return mine(playerId)
    },
    async addGames(rows) {
      for (const row of rows) if (!games.some((g) => g.id === row.id)) games.push({ ...row })
    },
    async listGames(playerId, mode, limit = 50) {
      return games
        .filter((g) => g.playerId === playerId && g.mode === mode)
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, limit)
    },
    async loadLadder(playerId) {
      const entry = ladders.get(playerId)
      return entry ? { playerId, ...entry.ladder } : null
    },
    async saveLadder(playerId, token, ladder) {
      const tokenHash = await hash(token)
      const existing = ladders.get(playerId)
      if (existing && existing.tokenHash !== tokenHash) throw new Error('ladder token does not match')
      ladders.set(playerId, { ladder: { ...ladder }, tokenHash })
    },
    async resetPlayerData(playerId, token) {
      const tokenHash = await hash(token)
      const owner = ladders.get(playerId)?.tokenHash ?? achievements.get(playerId)?.tokenHash ?? players.find((p) => p.id === playerId)?.tokenHash
      if (owner === undefined || owner !== tokenHash) return false
      const before = games.length
      for (let i = games.length - 1; i >= 0; i--) if (games[i].playerId === playerId) games.splice(i, 1)
      const hadLadder = ladders.delete(playerId)
      const hadAchievements = achievements.delete(playerId)
      return hadLadder || hadAchievements || games.length < before
    },
    onMyResultsChange(playerId, handler) {
      const set = myHandlers.get(playerId) ?? new Set()
      set.add(handler)
      myHandlers.set(playerId, set)
      handler(mine(playerId))
      return () => set.delete(handler)
    },
    async listRooms() {
      return publicRooms()
    },
    onRoomsChange(handler) {
      roomHandlers.add(handler)
      handler(publicRooms())
      return () => roomHandlers.delete(handler)
    },
    async createRoom(room) {
      const stored: StoredRoom = { ...room, createdAt: clock++ }
      rooms.push(stored)
      announceRooms()
      const { ownerHash: _h, ...record } = stored
      return record
    },
    async deleteRoom(id, token) {
      const at = rooms.findIndex((r) => r.id === id)
      if (at < 0 || rooms[at].ownerHash !== (await hash(token))) return false
      rooms.splice(at, 1)
      for (let i = results.length - 1; i >= 0; i--) if (results[i].roomId === id) results.splice(i, 1)
      announceRooms()
      announceResults(id, null)
      return true
    },
    async listResults(roomId) {
      return resultsOf(roomId)
    },
    onResultsChange(roomId, handler) {
      const set = resultHandlers.get(roomId) ?? new Set()
      set.add(handler)
      resultHandlers.set(roomId, set)
      handler(resultsOf(roomId))
      return () => set.delete(handler)
    },
    async addResult(result) {
      if (results.some((r) => r.gameId === result.gameId)) return
      results.push(result)
      announceResults(result.roomId, [result.winner.deviceId, result.loser.deviceId])
    },
  }
}
