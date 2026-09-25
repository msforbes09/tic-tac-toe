import { readAchievementState, type AchievementState } from '@/lib/achievements'
import type { GameRow } from '@/lib/history'
import type { Ladder } from '@/lib/ladder'
import type { SeriesResult } from '@/lib/room'
import type { Mode } from '@/lib/types'
import { PLAYERS_PAGE, type CloudLadder, type PlayerRecord, type RoomDirectory, type RoomRecord } from '@/lib/roomDirectory'

type Response<T> = { data: T; error: { message: string } | null }

/** The slice of the Supabase client this adapter uses, kept structural so tests can fake it. */
export type QueryLike = PromiseLike<Response<unknown>> & {
  select(columns: string): QueryLike
  order(column: string, options: { ascending: boolean }): QueryLike
  eq(column: string, value: string): QueryLike
  or(filters: string): QueryLike
  insert(row: Record<string, unknown>): QueryLike
  upsert(row: Record<string, unknown> | Record<string, unknown>[], options: { onConflict: string; ignoreDuplicates: boolean }): QueryLike
  single(): QueryLike
  maybeSingle(): QueryLike
  limit(count: number): QueryLike
}
export type ChangesChannelLike = {
  on(type: 'postgres_changes', filter: { event: string; schema: string; table: string; filter?: string }, callback: () => void): ChangesChannelLike
  subscribe(onStatus?: (status: string) => void): unknown
}
export type DirectoryClientLike = {
  from(table: 'rooms' | 'results' | 'games' | 'ladders' | 'players' | 'achievements'): QueryLike
  rpc(fn: 'delete_room', args: { room_id: string; token: string }): Promise<Response<unknown>>
  rpc(fn: 'upsert_player', args: { p_id: string; p_token: string; p_nickname: string }): Promise<Response<unknown>>
  rpc(
    fn: 'save_ladder',
    args: { p_id: string; p_token: string; p_rung: number | null; p_streak: number; p_top_held_at: string | null; p_top_held_count: number; p_updated_at: string },
  ): Promise<Response<unknown>>
  rpc(fn: 'reset_player_data', args: { p_id: string; p_token: string }): Promise<Response<unknown>>
  rpc(
    fn: 'save_achievements',
    args: { p_id: string; p_token: string; p_unlocks: unknown; p_progress: unknown; p_badge: string | null; p_updated_at: string },
  ): Promise<Response<unknown>>
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

type GameRowDb = {
  id: string
  player_id: string
  mode: Mode
  difficulty: GameRow['difficulty']
  rung: number | null
  outcome: GameRow['outcome']
  symbol: GameRow['symbol']
  played_at: string
}
type LadderRow = { player_id: string; rung: number | null; streak: number; updated_at: string }
type PlayerRow = { id: string; nickname: string }
type PlayerSeenRow = PlayerRow & { last_seen_at: string }
type AchievementsRow = { player_id: string; unlocks: unknown; progress: unknown; badge: string | null; updated_at: string }
/** The badge column cannot hold undefined: this stands for "never chose", so the default is worn. */
const DEFAULT_BADGE = 'default'

const gameFromRow = (r: GameRowDb): GameRow => ({
  id: r.id, playerId: r.player_id, mode: r.mode, difficulty: r.difficulty, rung: r.rung, outcome: r.outcome, symbol: r.symbol, playedAt: Date.parse(r.played_at),
})
const rowFromGame = (g: GameRow): GameRowDb => ({
  id: g.id, player_id: g.playerId, mode: g.mode, difficulty: g.difficulty, rung: g.rung, outcome: g.outcome, symbol: g.symbol, played_at: new Date(g.playedAt).toISOString(),
})
const ladderFromRow = (r: LadderRow): CloudLadder => ({
  playerId: r.player_id,
  rung: r.rung,
  streak: r.streak,
  updatedAt: Date.parse(r.updated_at),
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
    // Read now, and again whenever the channel joins (first time and after every reconnect), the
    // browser comes back online, or the app returns to the foreground: a one-shot read at launch can
    // fail quietly (an installed app opening before the network is up) and changes made while the
    // socket was down never arrive as events.
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') refetch()
    })
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener('online', refetch)
    document.addEventListener('visibilitychange', onVisible)
    refetch()
    return () => {
      live = false
      window.removeEventListener('online', refetch)
      document.removeEventListener('visibilitychange', onVisible)
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
    async addGames(rows) {
      if (rows.length === 0) return
      await unwrap(client.from('games').upsert(rows.map(rowFromGame), { onConflict: 'id', ignoreDuplicates: true }))
    },
    async listGames(playerId, mode, limit = 50) {
      const rows = await unwrap<GameRowDb[]>(
        client.from('games').select('*').eq('player_id', playerId).eq('mode', mode).order('played_at', { ascending: false }).limit(limit),
      )
      return rows.map(gameFromRow)
    },
    async resetPlayerData(playerId, token) {
      const { data, error } = await client.rpc('reset_player_data', { p_id: playerId, p_token: token })
      if (error) throw new Error(error.message)
      return data === true
    },
    async loadPlayer(playerId) {
      const row = await unwrap<PlayerRow | null>(client.from('players').select('*').eq('id', playerId).maybeSingle())
      return row ? { id: row.id, nickname: row.nickname } : null
    },
    async listPlayers(cursor) {
      let query = client.from('players').select('id,nickname,last_seen_at')
      // The cursor keeps the raw timestamp: a millisecond Date would drop Postgres's microseconds.
      if (cursor) {
        const [at, id] = JSON.parse(cursor) as [string, string]
        query = query.or(`last_seen_at.lt."${at}",and(last_seen_at.eq."${at}",id.lt."${id}")`)
      }
      const rows = await unwrap<PlayerSeenRow[]>(
        query.order('last_seen_at', { ascending: false }).order('id', { ascending: false }).limit(PLAYERS_PAGE + 1),
      )
      const page = rows.slice(0, PLAYERS_PAGE)
      const last = page[page.length - 1]
      return {
        players: page.map((r) => ({ id: r.id, nickname: r.nickname, lastSeenAt: Date.parse(r.last_seen_at) })),
        next: rows.length > PLAYERS_PAGE ? JSON.stringify([last.last_seen_at, last.id]) : null,
      }
    },
    async loadAchievements(playerId) {
      const row = await unwrap<AchievementsRow | null>(client.from('achievements').select('*').eq('player_id', playerId).maybeSingle())
      if (!row) return null
      return readAchievementState({
        unlocks: row.unlocks,
        progress: row.progress,
        badge: row.badge === DEFAULT_BADGE ? undefined : row.badge,
        updatedAt: Date.parse(row.updated_at),
      })
    },
    async saveAchievements(playerId, token, state: AchievementState) {
      const { error } = await client.rpc('save_achievements', {
        p_id: playerId,
        p_token: token,
        p_unlocks: state.unlocks,
        p_progress: state.progress,
        p_badge: state.badge === undefined ? DEFAULT_BADGE : state.badge,
        p_updated_at: new Date(state.updatedAt).toISOString(),
      })
      if (error) throw new Error(error.message)
    },
    async loadLadder(playerId) {
      const row = await unwrap<LadderRow | null>(client.from('ladders').select('*').eq('player_id', playerId).maybeSingle())
      return row ? ladderFromRow(row) : null
    },
    async saveLadder(playerId, token, ladder: Ladder) {
      const { error } = await client.rpc('save_ladder', {
        p_id: playerId,
        p_token: token,
        p_rung: ladder.rung,
        p_streak: ladder.streak,
        // The app no longer tracks draws at the top; save_ladder still takes these until a cleanup migration.
        p_top_held_at: null,
        p_top_held_count: 0,
        p_updated_at: new Date(ladder.updatedAt).toISOString(),
      })
      if (error) throw new Error(error.message)
    },
  }
}
