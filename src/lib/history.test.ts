import { describe, expect, it } from 'vitest'
import {
  MAX_ENTRIES,
  STORAGE_KEY,
  clearHistory,
  loadHistory,
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
