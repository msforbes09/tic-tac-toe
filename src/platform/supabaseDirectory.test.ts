import { describe, expect, it, vi } from 'vitest'
import { createSupabaseDirectory, type DirectoryClientLike } from './supabaseDirectory'

type Response = { data: unknown; error: { message: string } | null }

/** A stand-in for the Supabase client: records query chains and answers from a queue. */
function fakeClient(responses: Response[]) {
  const calls: unknown[][] = []
  const queue = [...responses]
  const changeHandlers: (() => void)[] = []
  const from = (table: string) => {
    const b: Record<string, unknown> = {}
    for (const op of ['select', 'order', 'eq', 'or', 'insert', 'upsert', 'single']) {
      b[op] = (...args: unknown[]) => {
        calls.push([table, op, ...args])
        return b
      }
    }
    b.then = (resolve: (v: Response) => void, reject: (e: unknown) => void) =>
      Promise.resolve(queue.shift() ?? { data: null, error: { message: 'no response queued' } }).then(resolve, reject)
    return b
  }
  const channel = {
    on: vi.fn((_type: string, _filter: unknown, cb: () => void) => {
      changeHandlers.push(cb)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  const client = {
    from: vi.fn(from),
    rpc: vi.fn(async () => queue.shift() ?? { data: null, error: null }),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  }
  return { client: client as unknown as DirectoryClientLike, calls, channel, fireChange: () => changeHandlers.forEach((h) => h()) }
}

const roomRow = { id: 'ABCD23', name: 'Quiet Edge', creator_id: 'z', owner_hash: 'h', created_at: '2026-09-24T10:00:00.000Z' }
const resultRow = {
  id: 'G1',
  room_id: 'ABCD23',
  challenger_id: 'a',
  challenged_id: 'b',
  winner_id: 'a',
  winner_name: 'Alice',
  loser_id: 'b',
  loser_name: 'Bob',
  winner_score: 6,
  loser_score: 2,
  games: 8,
  reason: 'decided',
  ended_at: '2026-09-24T11:00:00.000Z',
}

describe('createSupabaseDirectory', () => {
  it('lists rooms newest first and maps the rows', async () => {
    const f = fakeClient([{ data: [roomRow], error: null }])
    const rooms = await createSupabaseDirectory(f.client).listRooms()
    expect(rooms).toEqual([{ id: 'ABCD23', name: 'Quiet Edge', creatorId: 'z', createdAt: Date.parse(roomRow.created_at) }])
    expect(f.calls).toEqual([
      ['rooms', 'select', '*'],
      ['rooms', 'order', 'created_at', { ascending: false }],
    ])
  })

  it('creates a room with the hashed token and returns the record', async () => {
    const f = fakeClient([{ data: roomRow, error: null }])
    const room = await createSupabaseDirectory(f.client).createRoom({ id: 'ABCD23', name: 'Quiet Edge', creatorId: 'z', ownerHash: 'h' })
    expect(room.name).toBe('Quiet Edge')
    expect(f.calls[0]).toEqual(['rooms', 'insert', { id: 'ABCD23', name: 'Quiet Edge', creator_id: 'z', owner_hash: 'h' }])
  })

  it('deletes through the token-checking function', async () => {
    const f = fakeClient([{ data: true, error: null }, { data: false, error: null }])
    const dir = createSupabaseDirectory(f.client)
    expect(await dir.deleteRoom('ABCD23', 'tok')).toBe(true)
    expect(f.client.rpc).toHaveBeenCalledWith('delete_room', { room_id: 'ABCD23', token: 'tok' })
    expect(await dir.deleteRoom('ABCD23', 'bad')).toBe(false)
  })

  it('lists results for a room and writes them idempotently by gameId', async () => {
    const f = fakeClient([{ data: [resultRow], error: null }, { data: null, error: null }])
    const dir = createSupabaseDirectory(f.client)
    const results = await dir.listResults('ABCD23')
    expect(results).toEqual([
      {
        gameId: 'G1',
        roomId: 'ABCD23',
        challengerId: 'a',
        challengedId: 'b',
        winner: { deviceId: 'a', nickname: 'Alice' },
        loser: { deviceId: 'b', nickname: 'Bob' },
        winnerScore: 6,
        loserScore: 2,
        games: 8,
        reason: 'decided',
        endedAt: Date.parse(resultRow.ended_at),
      },
    ])
    expect(f.calls.slice(0, 3)).toEqual([
      ['results', 'select', '*'],
      ['results', 'eq', 'room_id', 'ABCD23'],
      ['results', 'order', 'ended_at', { ascending: false }],
    ])
    await dir.addResult(results[0])
    expect(f.calls[3]).toEqual(['results', 'upsert', resultRow, { onConflict: 'id', ignoreDuplicates: true }])
  })

  it('watches the rooms table and refetches on change', async () => {
    const f = fakeClient([
      { data: [roomRow], error: null },
      { data: [], error: null },
    ])
    const seen = vi.fn()
    const off = createSupabaseDirectory(f.client).onRoomsChange(seen)
    await new Promise((r) => setTimeout(r, 0))
    expect(seen).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'ABCD23' })])
    expect(f.channel.on).toHaveBeenCalledWith('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, expect.any(Function))
    f.fireChange()
    await new Promise((r) => setTimeout(r, 0))
    expect(seen).toHaveBeenLastCalledWith([])
    off()
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1)
  })

  it('throws a readable error when Supabase reports one', async () => {
    const f = fakeClient([{ data: null, error: { message: 'permission denied' } }])
    await expect(createSupabaseDirectory(f.client).listRooms()).rejects.toThrow('permission denied')
  })

  it('saves a player through the token-checking function', async () => {
    const f = fakeClient([{ data: null, error: null }])
    await createSupabaseDirectory(f.client).savePlayer({ id: 'a', nickname: 'Alice' }, 'tok')
    expect(f.client.rpc).toHaveBeenCalledWith('upsert_player', { p_id: 'a', p_token: 'tok', p_nickname: 'Alice' })
  })

  it('lists my results as winner or loser across rooms', async () => {
    const f = fakeClient([{ data: [resultRow], error: null }])
    const mine = await createSupabaseDirectory(f.client).listMyResults('a')
    expect(mine).toHaveLength(1)
    expect(f.calls).toEqual([
      ['results', 'select', '*'],
      ['results', 'or', 'winner_id.eq.a,loser_id.eq.a'],
      ['results', 'order', 'ended_at', { ascending: false }],
    ])
  })
})
