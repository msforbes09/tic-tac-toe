import { describe, expect, it } from 'vitest'
import {
  ROOM_CODE_ALPHABET,
  createRoomCode,
  normalizeRoomCode,
  roomCodeFromUrl,
  isRoomMessage,
  roomLink,
  withoutRoomParam,
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
    expect(normalizeRoomCode('ABCDE')).toBeNull()
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

describe('isRoomMessage', () => {
  it('accepts the three message shapes', () => {
    expect(isRoomMessage({ type: 'move', index: 4 })).toBe(true)
    expect(isRoomMessage({ type: 'new-game' })).toBe(true)
    expect(isRoomMessage({ type: 'state', state: snapshot })).toBe(true)
    expect(
      isRoomMessage({
        type: 'state',
        state: { ...snapshot, status: 'won', winner: 'X', winningLine: [0, 1, 2] },
      }),
    ).toBe(true)
  })

  it('rejects anything that is not a message', () => {
    expect(isRoomMessage(null)).toBe(false)
    expect(isRoomMessage('move')).toBe(false)
    expect(isRoomMessage({ type: 'chat', text: 'hi' })).toBe(false)
    expect(isRoomMessage({ type: 'move' })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: '4' })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: 4.5 })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: 9 })).toBe(false)
    expect(isRoomMessage({ type: 'move', index: -1 })).toBe(false)
  })

  it('rejects malformed snapshots', () => {
    const bad = (patch: Record<string, unknown>) => isRoomMessage({ type: 'state', state: { ...snapshot, ...patch } })
    expect(isRoomMessage({ type: 'state' })).toBe(false)
    expect(bad({ board: snapshot.board.slice(0, 8) })).toBe(false)
    expect(bad({ board: [...snapshot.board.slice(0, 8), 'Z'] })).toBe(false)
    expect(bad({ p1Symbol: 'Z' })).toBe(false)
    expect(bad({ status: 'paused' })).toBe(false)
    expect(bad({ winner: 'draw' })).toBe(false)
    expect(bad({ winningLine: [0, 1] })).toBe(false)
    expect(bad({ winningLine: [0, 1, 9] })).toBe(false)
    expect(bad({ score: { p1: 1, p2: 0 } })).toBe(false)
    expect(bad({ score: { p1: -1, p2: 0, draws: 0 } })).toBe(false)
  })
})
