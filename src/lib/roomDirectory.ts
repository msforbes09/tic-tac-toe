import type { SeriesResult } from './room'

export type RoomRecord = { id: string; name: string; creatorId: string; createdAt: number }

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
}

type StoredRoom = RoomRecord & { ownerHash: string }

/** In-memory directory for tests. `hash` must match what callers used for `ownerHash`. */
export function createFakeDirectory(hash: (token: string) => Promise<string>): RoomDirectory & { rooms(): RoomRecord[] } {
  const rooms: StoredRoom[] = []
  const results: SeriesResult[] = []
  const roomHandlers = new Set<(rooms: RoomRecord[]) => void>()
  const resultHandlers = new Map<string, Set<(results: SeriesResult[]) => void>>()
  let clock = 1

  const publicRooms = (): RoomRecord[] =>
    [...rooms].sort((a, b) => b.createdAt - a.createdAt).map(({ ownerHash: _h, ...r }) => r)
  const resultsOf = (roomId: string): SeriesResult[] =>
    results.filter((r) => r.roomId === roomId).sort((a, b) => b.endedAt - a.endedAt)
  const announceRooms = () => {
    const list = publicRooms()
    for (const h of roomHandlers) h(list)
  }
  const announceResults = (roomId: string) => {
    const list = resultsOf(roomId)
    for (const h of resultHandlers.get(roomId) ?? []) h(list)
  }

  return {
    rooms: publicRooms,
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
      announceResults(id)
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
      announceResults(result.roomId)
    },
  }
}
