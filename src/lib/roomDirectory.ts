import type { SeriesResult } from './room'

export type RoomRecord = { id: string; name: string; creatorId: string; createdAt: number }
export type PlayerRecord = { id: string; nickname: string }

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
  /** Every series this player won or lost, across rooms, newest first. */
  listMyResults(playerId: string): Promise<SeriesResult[]>
  onMyResultsChange(playerId: string, handler: (results: SeriesResult[]) => void): () => void
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
    async listMyResults(playerId) {
      return mine(playerId)
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
