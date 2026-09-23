import { describe, expect, it } from 'vitest'
import {
  MAX_ENTRIES,
  STORAGE_KEY,
  clearHistory,
  loadHistory,
  newEntryId,
  saveGame,
  type HistoryEntry,
  type HistoryStorage,
} from './history'

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  const storage: HistoryStorage & { dump: () => Record<string, string> } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    dump: () => Object.fromEntries(map),
  }
  return storage
}

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'id-1',
  timestamp: 1_700_000_000_000,
  mode: 'bot',
  difficulty: 'hard',
  outcome: 'draw',
  ...over,
})

describe('loadHistory', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadHistory(fakeStorage())).toEqual([])
  })

  it('returns an empty list for invalid JSON', () => {
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: '{not json' }))).toEqual([])
  })

  it('returns an empty list when the stored value is not an array', () => {
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: '{"a":1}' }))).toEqual([])
  })

  it('returns stored entries', () => {
    const stored = [entry({ id: 'a' }), entry({ id: 'b', mode: 'pvp', difficulty: null })]
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: JSON.stringify(stored) }))).toEqual(stored)
  })

  it('drops malformed entries', () => {
    const stored = [entry({ id: 'ok' }), { id: 'bad' }, null, 'x']
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: JSON.stringify(stored) }))).toEqual([
      entry({ id: 'ok' }),
    ])
  })
})

describe('saveGame', () => {
  it('prepends the entry and writes it back', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify([entry({ id: 'old' })]) })
    const result = saveGame(storage, entry({ id: 'new' }))
    expect(result.map((e) => e.id)).toEqual(['new', 'old'])
    expect(JSON.parse(storage.dump()[STORAGE_KEY]).map((e: HistoryEntry) => e.id)).toEqual([
      'new',
      'old',
    ])
  })

  it('starts a list when nothing is stored', () => {
    const storage = fakeStorage()
    expect(saveGame(storage, entry())).toEqual([entry()])
  })

  it('caps the list at MAX_ENTRIES, dropping the oldest', () => {
    const existing = Array.from({ length: MAX_ENTRIES }, (_, i) => entry({ id: `e${i}` }))
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(existing) })
    const result = saveGame(storage, entry({ id: 'newest' }))
    expect(result).toHaveLength(MAX_ENTRIES)
    expect(result[0].id).toBe('newest')
    expect(result.at(-1)?.id).toBe(`e${MAX_ENTRIES - 2}`)
  })
})

describe('clearHistory', () => {
  it('removes the key', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '[]', other: 'keep' })
    clearHistory(storage)
    expect(storage.dump()).toEqual({ other: 'keep' })
    expect(loadHistory(storage)).toEqual([])
  })
})

describe('newEntryId', () => {
  it('returns a non-empty string that differs between calls', () => {
    const a = newEntryId()
    const b = newEntryId()
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})
