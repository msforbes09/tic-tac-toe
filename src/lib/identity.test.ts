import { describe, expect, it } from 'vitest'
import type { HistoryStorage } from './history'
import {
  DEVICE_KEY,
  NICKNAME_KEY,
  OWNED_KEY,
  loadDeviceId,
  loadNickname,
  loadOwnedRooms,
  loadPlayerToken,
  NICKNAME_MAX,
  normalizeNickname,
  sanitizeNicknameInput,
  removeOwnedRoom,
  saveNickname,
  saveOwnedRoom,
  sha256Hex,
  sha256HexFallback,
} from './identity'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const s: HistoryStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
  return s
}

describe('identity', () => {
  it('creates a device id once and keeps it', () => {
    const s = fakeStorage()
    const id = loadDeviceId(s)
    expect(id.length).toBeGreaterThanOrEqual(8)
    expect(s.getItem(DEVICE_KEY)).toBe(id)
    expect(loadDeviceId(s)).toBe(id)
  })

  it('normalizes nicknames: 2–12 letters, digits and single spaces', () => {
    expect(normalizeNickname('  Sly   Fork ')).toBe('Sly Fork')
    expect(normalizeNickname('a')).toBeNull()
    expect(normalizeNickname('x'.repeat(13))).toBeNull()
    expect(normalizeNickname('x'.repeat(12))).toBe('x'.repeat(12))
    expect(normalizeNickname('   ')).toBeNull()
    expect(normalizeNickname('Bob!')).toBeNull()
    expect(normalizeNickname('Ana 2')).toBe('Ana 2')
  })

  it('filters input as it is typed: drops other characters, collapses spaces, caps at 12', () => {
    expect(sanitizeNicknameInput('Bob!@# Cat')).toBe('Bob Cat')
    expect(sanitizeNicknameInput('Bob   Cat')).toBe('Bob Cat')
    expect(sanitizeNicknameInput('  Bob')).toBe('Bob')
    expect(sanitizeNicknameInput('Bob ')).toBe('Bob ')
    expect(sanitizeNicknameInput('abcdefghijklmnop')).toBe('abcdefghijkl')
    expect(NICKNAME_MAX).toBe(12)
  })

  it('round-trips the nickname', () => {
    const s = fakeStorage()
    expect(loadNickname(s)).toBeNull()
    saveNickname(s, 'Bold Corner')
    expect(s.getItem(NICKNAME_KEY)).toBe('Bold Corner')
    expect(loadNickname(s)).toBe('Bold Corner')
  })

  it('remembers owner tokens per room', () => {
    const s = fakeStorage()
    saveOwnedRoom(s, 'r1', 't1')
    saveOwnedRoom(s, 'r2', 't2')
    expect(loadOwnedRooms(s)).toEqual({ r1: 't1', r2: 't2' })
    removeOwnedRoom(s, 'r1')
    expect(loadOwnedRooms(s)).toEqual({ r2: 't2' })
    expect(loadOwnedRooms(fakeStorage({ [OWNED_KEY]: '{bad' }))).toEqual({})
  })

  it('hashes with SHA-256 (known vector) in both paths', async () => {
    const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    expect(sha256HexFallback('abc')).toBe(expected)
    expect(await sha256Hex('abc')).toBe(expected)
  })

  it('creates a player token once and keeps it', () => {
    const s = fakeStorage()
    const token = loadPlayerToken(s)
    expect(token.length).toBeGreaterThanOrEqual(16)
    expect(loadPlayerToken(s)).toBe(token)
  })
})
