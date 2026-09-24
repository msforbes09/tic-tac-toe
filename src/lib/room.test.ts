import { describe, expect, it } from 'vitest'
import {
  ROOM_CODE_ALPHABET,
  createRoomCode,
  normalizeRoomCode,
  roomCodeFromUrl,
  roomLink,
  withoutRoomParam,
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
