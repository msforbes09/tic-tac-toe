import { describe, expect, it } from 'vitest'
import {
  MAX_ENTRIES,
  STORAGE_KEY,
  clearHistory,
  botStats,
  loadHistory,
  newEntryId,
  saveGame,
  winnerSeat,
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

describe('p1Symbol on entries', () => {
  it('keeps a valid p1Symbol', () => {
    const stored = [entry({ id: 'a', p1Symbol: 'O' })]
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: JSON.stringify(stored) }))).toEqual(stored)
  })

  it('drops entries with an invalid p1Symbol', () => {
    const stored = [entry({ id: 'ok' }), { ...entry({ id: 'bad' }), p1Symbol: 'Z' }]
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: JSON.stringify(stored) }))).toEqual([entry({ id: 'ok' })])
  })
})

describe('winnerSeat', () => {
  it('is null for a draw', () => {
    expect(winnerSeat(entry({ outcome: 'draw' }))).toBeNull()
  })

  it('reads older entries without p1Symbol as player one playing X', () => {
    expect(winnerSeat(entry({ outcome: 'X' }))).toBe('p1')
    expect(winnerSeat(entry({ outcome: 'O' }))).toBe('p2')
  })

  it('credits the seat that held the winning symbol', () => {
    expect(winnerSeat(entry({ outcome: 'X', p1Symbol: 'O' }))).toBe('p2')
    expect(winnerSeat(entry({ outcome: 'O', p1Symbol: 'O' }))).toBe('p1')
  })
})

describe('botStats', () => {
  it('counts your wins, losses, and draws per difficulty, ignoring two-player games', () => {
    const stats = botStats([
      entry({ difficulty: 'easy', outcome: 'X' }),
      entry({ difficulty: 'easy', outcome: 'X', p1Symbol: 'O' }),
      entry({ difficulty: 'easy', outcome: 'draw' }),
      entry({ difficulty: 'hard', outcome: 'O' }),
      entry({ mode: 'pvp', difficulty: null, outcome: 'X' }),
    ])
    expect(stats).toEqual({
      easy: { wins: 1, losses: 1, draws: 1 },
      medium: { wins: 0, losses: 0, draws: 0 },
      hard: { wins: 0, losses: 1, draws: 0 },
    })
  })

  it('accepts online entries and keeps them out of the bot record', () => {
    const storage = fakeStorage()
    saveGame(storage, { id: 'o1', timestamp: 1, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' })
    const entries = loadHistory(storage)
    expect(entries).toHaveLength(1)
    expect(entries[0].mode).toBe('online')
    expect(botStats(entries)).toEqual({
      easy: { wins: 0, losses: 0, draws: 0 },
      medium: { wins: 0, losses: 0, draws: 0 },
      hard: { wins: 0, losses: 0, draws: 0 },
    })
  })
})
