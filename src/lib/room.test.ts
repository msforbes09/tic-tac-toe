import { describe, expect, it } from 'vitest'
import {
  LOBBY_CHANNEL,
  ROOM_CODE_ALPHABET,
  createId,
  createRoomCode,
  gameChannel,
  isGameMessage,
  isGamePresence,
  isGameSnapshot,
  isLobbyPresence,
  isRoomEvent,
  isRoomPresence,
  normalizeRoomCode,
  pairsInProgress,
  readSupabaseConfig,
  roomChannel,
  roomCodeFromUrl,
  roomLink,
  withoutRoomParam,
  type RoomPresence,
  type Snapshot,
} from './room'

describe('room codes', () => {
  it('makes four characters from the unambiguous alphabet', () => {
    const code = createRoomCode()
    expect(code).toHaveLength(4)
    for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch)
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[0O1IL]/)
  })

  it('maps the random source onto the alphabet, clamping 1', () => {
    expect(createRoomCode(() => 0)).toBe('AAAA')
    expect(createRoomCode(() => 0.999999)).toBe('9999')
    expect(createRoomCode(() => 1)).toBe('9999')
  })

  it('normalizes case and whitespace', () => {
    expect(normalizeRoomCode(' ab 2c ')).toBe('AB2C')
    expect(normalizeRoomCode('AB2C')).toBe('AB2C')
  })

  it('rejects the wrong length or characters outside the alphabet', () => {
    expect(normalizeRoomCode('')).toBeNull()
    expect(normalizeRoomCode('ABC')).toBeNull()
    expect(normalizeRoomCode('ABCDE')).toBe('ABCDE')
    expect(normalizeRoomCode('ABCDEFGHJ')).toBeNull()
    expect(normalizeRoomCode('AB0C')).toBeNull()
    expect(normalizeRoomCode('AB1C')).toBeNull()
    expect(normalizeRoomCode('ABIC')).toBeNull()
    expect(normalizeRoomCode('AB-C')).toBeNull()
  })
})

describe('room links', () => {
  it('reads and normalizes ?room= from a URL', () => {
    expect(roomCodeFromUrl('https://x.test/app/?room=ab2c')).toBe('AB2C')
    expect(roomCodeFromUrl('https://x.test/app/?room=%20ab2c')).toBe('AB2C')
  })

  it('ignores a missing, empty, or garbage room parameter', () => {
    expect(roomCodeFromUrl('https://x.test/app/')).toBeNull()
    expect(roomCodeFromUrl('https://x.test/app/?room=')).toBeNull()
    expect(roomCodeFromUrl('https://x.test/app/?room=<script>')).toBeNull()
    expect(roomCodeFromUrl('not a url')).toBeNull()
  })

  it('builds a link on the app URL, dropping any existing query or hash', () => {
    expect(roomLink('https://x.test/tic-tac-toe-react/', 'AB2C')).toBe('https://x.test/tic-tac-toe-react/?room=AB2C')
    expect(roomLink('https://x.test/app/?room=OLD1#top', 'AB2C')).toBe('https://x.test/app/?room=AB2C')
  })

  it('removes only the room parameter', () => {
    expect(withoutRoomParam('https://x.test/app/?room=AB2C')).toBe('https://x.test/app/')
    expect(withoutRoomParam('https://x.test/app/?a=1&room=AB2C')).toBe('https://x.test/app/?a=1')
  })
})

const snapshot: Snapshot = {
  board: ['X', null, null, null, 'O', null, null, null, null],
  p1Symbol: 'X',
  score: { p1: 1, p2: 0, draws: 2 },
  status: 'playing',
  winner: null,
  winningLine: null,
}

describe('isGameSnapshot', () => {
  it('accepts a board snapshot and rejects malformed ones', () => {
    expect(isGameSnapshot(snapshot)).toBe(true)
    expect(isGameSnapshot({ ...snapshot, status: 'won', winner: 'X', winningLine: [0, 1, 2] })).toBe(true)
    const bad = (patch: Record<string, unknown>) => isGameSnapshot({ ...snapshot, ...patch })
    expect(bad({ board: snapshot.board.slice(0, 8) })).toBe(false)
    expect(bad({ board: [...snapshot.board.slice(0, 8), 'Z'] })).toBe(false)
    expect(bad({ p1Symbol: 'Z' })).toBe(false)
    expect(bad({ status: 'paused' })).toBe(false)
    expect(bad({ winner: 'draw' })).toBe(false)
    expect(bad({ winningLine: [0, 1] })).toBe(false)
    expect(bad({ score: { p1: -1, p2: 0, draws: 0 } })).toBe(false)
  })
})

describe('ids and channels', () => {
  it('makes ids of any length and names channels', () => {
    expect(createId(6, () => 0)).toBe('AAAAAA')
    expect(roomChannel('AB2CDE')).toBe('ttt-room:AB2CDE')
    expect(gameChannel('G1')).toBe('ttt-game:G1')
    expect(LOBBY_CHANNEL).toBe('ttt-lobby')
    expect(normalizeRoomCode('ab2cde')).toBe('AB2CDE')
    expect(normalizeRoomCode('ab2cdefgh')).toBeNull()
  })
})

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const result = {
  gameId: 'g',
  roomId: 'r',
  winner: alice,
  loser: bob,
  winnerScore: 6,
  loserScore: 4,
  games: 10,
  reason: 'decided',
  endedAt: 1,
}

describe('isRoomEvent', () => {
  it('accepts every event and rejects junk', () => {
    expect(isRoomEvent({ type: 'challenge', gameId: 'g', from: alice, to: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'accept', gameId: 'g', from: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'decline', gameId: 'g', from: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'cancel', gameId: 'g', from: 'a' })).toBe(true)
    expect(isRoomEvent({ type: 'series-ended', result })).toBe(true)
    expect(isRoomEvent({ type: 'room-deleted' })).toBe(true)
    expect(isRoomEvent({ type: 'challenge', gameId: 'g', from: 'a', to: 'b' })).toBe(false)
    expect(isRoomEvent({ type: 'series-ended', result: { ...result, reason: 'quit' } })).toBe(false)
    expect(isRoomEvent({ type: 'kick' })).toBe(false)
    expect(isRoomEvent(null)).toBe(false)
  })
})

describe('isGameMessage', () => {
  it('accepts moves, next-game, resign, hello, state', () => {
    expect(isGameMessage({ type: 'move', index: 4, from: 'a' })).toBe(true)
    expect(isGameMessage({ type: 'next-game', from: 'a' })).toBe(true)
    expect(isGameMessage({ type: 'resign', from: 'b' })).toBe(true)
    expect(isGameMessage({ type: 'hello', from: 'b' })).toBe(true)
    expect(isGameMessage({ type: 'state', state: {} })).toBe(true)
    expect(isGameMessage({ type: 'move', index: 9, from: 'a' })).toBe(false)
    expect(isGameMessage({ type: 'move', index: 1 })).toBe(false)
    expect(isGameMessage({ type: 'new-game' })).toBe(false)
  })
})

describe('presence shapes', () => {
  it('validates room, game and lobby presence', () => {
    expect(isRoomPresence({ deviceId: 'a', nickname: 'Alice', status: 'idle', gameId: null })).toBe(true)
    expect(isRoomPresence({ deviceId: 'a', nickname: 'Alice', status: 'playing', gameId: 'g' })).toBe(true)
    expect(isRoomPresence({ deviceId: 'a', nickname: 'Alice', status: 'asleep', gameId: null })).toBe(false)
    expect(isGamePresence({ deviceId: 'a', role: 'referee' })).toBe(true)
    expect(isGamePresence({ deviceId: 'a', role: 'coach' })).toBe(false)
    expect(isLobbyPresence({ roomId: 'r', nickname: 'Alice' })).toBe(true)
    expect(isLobbyPresence({ roomId: 'r' })).toBe(false)
  })

  it('pairs playing members by game', () => {
    const members: RoomPresence[] = [
      { deviceId: 'a', nickname: 'Alice', status: 'playing', gameId: 'g1' },
      { deviceId: 'b', nickname: 'Bob', status: 'playing', gameId: 'g1' },
      { deviceId: 'c', nickname: 'Cat', status: 'watching', gameId: 'g1' },
      { deviceId: 'd', nickname: 'Dan', status: 'playing', gameId: 'g2' },
      { deviceId: 'e', nickname: 'Eve', status: 'idle', gameId: null },
    ]
    expect(pairsInProgress(members)).toEqual([{ gameId: 'g1', players: [alice, bob] }])
  })
})

describe('readSupabaseConfig', () => {
  it('reads both values', () => {
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 'key' })).toEqual({
      url: 'https://p.supabase.co',
      anonKey: 'key',
    })
  })

  it('is null when either is missing or blank', () => {
    expect(readSupabaseConfig({})).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co' })).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_ANON_KEY: 'key' })).toBeNull()
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://p.supabase.co', VITE_SUPABASE_ANON_KEY: 42 })).toBeNull()
  })
})
