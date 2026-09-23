import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SETUP_KEY, loadSetup, saveSetup } from './setup'
import type { HistoryStorage } from './history'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const storage: HistoryStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
  }
  return storage
}

describe('setup memory', () => {
  it('defaults to two player, medium, X when nothing is saved', () => {
    expect(DEFAULT_SETTINGS).toEqual({ mode: 'pvp', difficulty: 'medium', p1Symbol: 'X' })
    expect(loadSetup(fakeStorage())).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips the last setup', () => {
    const storage = fakeStorage()
    saveSetup(storage, { mode: 'bot', difficulty: 'hard', p1Symbol: 'O' })
    expect(loadSetup(storage)).toEqual({ mode: 'bot', difficulty: 'hard', p1Symbol: 'O' })
  })

  it('falls back to defaults for unreadable data', () => {
    expect(loadSetup(fakeStorage({ [SETUP_KEY]: '{not json' }))).toEqual(DEFAULT_SETTINGS)
    expect(loadSetup(fakeStorage({ [SETUP_KEY]: '42' }))).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps the valid fields and defaults the invalid ones', () => {
    const raw = JSON.stringify({ mode: 'bot', difficulty: 'impossible', p1Symbol: 'Z' })
    expect(loadSetup(fakeStorage({ [SETUP_KEY]: raw }))).toEqual({ mode: 'bot', difficulty: 'medium', p1Symbol: 'X' })
  })

  it('survives storage that throws', () => {
    const broken: HistoryStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {},
    }
    expect(loadSetup(broken)).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSetup(broken, DEFAULT_SETTINGS)).not.toThrow()
  })
})
