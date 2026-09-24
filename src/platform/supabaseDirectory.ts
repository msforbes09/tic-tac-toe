import type { SeriesResult } from '@/lib/room'
import type { PlayerRecord, RoomDirectory, RoomRecord } from '@/lib/roomDirectory'

type Response<T> = { data: T; error: { message: string } | null }

/** The slice of the Supabase client this adapter uses, kept structural so tests can fake it. */
export type QueryLike = PromiseLike<Response<unknown>> & {
  select(columns: string): QueryLike
  order(column: string, options: { ascending: boolean }): QueryLike
  eq(column: string, value: string): QueryLike
  or(filters: string): QueryLike
  insert(row: Record<string, unknown>): QueryLike
  upsert(row: Record<string, unknown>, options: { onConflict: string; ignoreDuplicates: boolean }): QueryLike
  single(): QueryLike
}
export type ChangesChannelLike = {
  on(type: 'postgres_changes', filter: { event: string; schema: string; table: string; filter?: string }, callback: () => void): ChangesChannelLike
  subscribe(): unknown
}
export type DirectoryClientLike = {
  from(table: 'rooms' | 'results'): QueryLike
  rpc(fn: 'delete_room', args: { room_id: string; token: string }): Promise<Response<unknown>>
  rpc(fn: 'upsert_player', args: { p_id: string; p_token: string; p_nickname: string }): Promise<Response<unknown>>
  channel(name: string): ChangesChannelLike
  removeChannel(channel: ChangesChannelLike): Promise<unknown>
}

type RoomRow = { id: string; name: string; creator_id: string; created_at: string }
type ResultRow = {
  id: string
  room_id: string
  challenger_id: string
  challenged_id: string
  winner_id: string
  winner_name: string
  loser_id: string
  loser_name: string
  winner_score: number
  loser_score: number
  games: number
  reason: SeriesResult['reason']
  ended_at: string
}

const roomFromRow = (r: RoomRow): RoomRecord => ({ id: r.id, name: r.name, creatorId: r.creator_id, createdAt: Date.parse(r.created_at) })
const resultFromRow = (r: ResultRow): SeriesResult => ({
  gameId: r.id,
  roomId: r.room_id,
  challengerId: r.challenger_id,
  challengedId: r.challenged_id,
  winner: { deviceId: r.winner_id, nickname: r.winner_name },
  loser: { deviceId: r.loser_id, nickname: r.loser_name },
  winnerScore: r.winner_score,
  loserScore: r.loser_score,
  games: r.games,
  reason: r.reason,
  endedAt: Date.parse(r.ended_at),
})
const rowFromResult = (r: SeriesResult): ResultRow => ({
  id: r.gameId,
  room_id: r.roomId,
  challenger_id: r.challengerId,
  challenged_id: r.challengedId,
  winner_id: r.winner.deviceId,
  winner_name: r.winner.nickname,
  loser_id: r.loser.deviceId,
  loser_name: r.loser.nickname,
  winner_score: r.winnerScore,
  loser_score: r.loserScore,
  games: r.games,
  reason: r.reason,
  ended_at: new Date(r.endedAt).toISOString(),
})

async function unwrap<T>(query: PromiseLike<Response<unknown>>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

/** Rooms and results in Postgres, with live refetches from `postgres_changes`. */
export function createSupabaseDirectory(client: DirectoryClientLike): RoomDirectory {
  let channelSeq = 0

  const listRooms = async (): Promise<RoomRecord[]> => {
    const rows = await unwrap<RoomRow[]>(client.from('rooms').select('*').order('created_at', { ascending: false }))
    return rows.map(roomFromRow)
  }
  const listResults = async (roomId: string): Promise<SeriesResult[]> => {
    const rows = await unwrap<ResultRow[]>(
      client.from('results').select('*').eq('room_id', roomId).order('ended_at', { ascending: false }),
    )
    return rows.map(resultFromRow)
  }

  /** Fetch now and again on every change to the table; errors leave the last good list in place. */
  const watch = <T,>(table: 'rooms' | 'results', filter: string | undefined, fetch: () => Promise<T>, handler: (v: T) => void) => {
    let live = true
    const refetch = () => {
      void fetch().then((v) => live && handler(v)).catch(() => {})
    }
    const channel = client
      .channel(`directory-${table}-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, refetch)
    channel.subscribe()
    refetch()
    return () => {
      live = false
      void client.removeChannel(channel)
    }
  }

  const listMyResults = async (playerId: string): Promise<SeriesResult[]> => {
    const rows = await unwrap<ResultRow[]>(
      client
        .from('results')
        .select('*')
        .or(`winner_id.eq.${playerId},loser_id.eq.${playerId}`)
        .order('ended_at', { ascending: false }),
    )
    return rows.map(resultFromRow)
  }

  return {
    listRooms,
    onRoomsChange: (handler) => watch('rooms', undefined, listRooms, handler),
    async savePlayer(player: PlayerRecord, token: string) {
      const { error } = await client.rpc('upsert_player', { p_id: player.id, p_token: token, p_nickname: player.nickname })
      if (error) throw new Error(error.message)
    },
    listMyResults,
    // postgres_changes filters take one column, so my-results watches the whole table and refetches.
    onMyResultsChange: (playerId, handler) => watch('results', undefined, () => listMyResults(playerId), handler),
    async createRoom(room) {
      const row = await unwrap<RoomRow>(
        client
          .from('rooms')
          .insert({ id: room.id, name: room.name, creator_id: room.creatorId, owner_hash: room.ownerHash })
          .select('*')
          .single(),
      )
      return roomFromRow(row)
    },
    async deleteRoom(id, token) {
      const { data, error } = await client.rpc('delete_room', { room_id: id, token })
      if (error) throw new Error(error.message)
      return data === true
    },
    listResults,
    onResultsChange: (roomId, handler) => watch('results', `room_id=eq.${roomId}`, () => listResults(roomId), handler),
    async addResult(result) {
      await unwrap(client.from('results').upsert(rowFromResult(result), { onConflict: 'id', ignoreDuplicates: true }))
    },
  }
}
