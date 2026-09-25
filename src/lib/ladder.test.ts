import { newerLadder } from './ladder'
import { describe, expect, it } from 'vitest'
import {
  EMPTY_LADDER,
  LADDER_KEY,
  TOP_RUNG,
  advance,
  bandBottom,
  bandOf,
  suggestedBand,
  loadLadder,
  rungForSelection,
  saveLadder,
  type Ladder,
} from './ladder'
import type { HistoryStorage } from './history'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const storage: HistoryStorage & { dump: () => Record<string, string> } = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    dump: () => Object.fromEntries(data),
  }
  return storage
}

const at = (rung: number, over: Partial<Ladder> = {}): Ladder => ({ ...EMPTY_LADDER, rung, ...over })

describe('bands', () => {
  it('splits 30 rungs into three bands of ten', () => {
    expect(TOP_RUNG).toBe(30)
    expect(bandOf(1)).toBe('easy')
    expect(bandOf(10)).toBe('easy')
    expect(bandOf(11)).toBe('medium')
    expect(bandOf(20)).toBe('medium')
    expect(bandOf(21)).toBe('hard')
    expect(bandOf(30)).toBe('hard')
  })
})

describe('advance', () => {
  it('moves one rung: win up, loss down, draw stays', () => {
    expect(advance(at(15), 'win', 0).rung).toBe(16)
    expect(advance(at(15), 'loss', 0).rung).toBe(14)
    expect(advance(at(15), 'draw', 0).rung).toBe(15)
  })

  it('never leaves the ladder', () => {
    expect(advance(at(30), 'win', 0).rung).toBe(30)
    expect(advance(at(1), 'loss', 0).rung).toBe(1)
  })

  it('counts a streak of wins or losses, and a draw breaks it', () => {
    expect(advance(at(15), 'win', 0).streak).toBe(1)
    expect(advance(at(15, { streak: 2 }), 'win', 0).streak).toBe(3)
    expect(advance(at(15, { streak: 2 }), 'loss', 0).streak).toBe(-1)
    expect(advance(at(15, { streak: -1 }), 'loss', 0).streak).toBe(-2)
    expect(advance(at(15, { streak: 2 }), 'draw', 0).streak).toBe(0)
  })

  it('jumps two rungs from the third win in a row, and from the third loss', () => {
    expect(advance(at(15, { streak: 2 }), 'win', 0).rung).toBe(17)
    expect(advance(at(15, { streak: 3 }), 'win', 0).rung).toBe(17)
    expect(advance(at(15, { streak: 1 }), 'win', 0).rung).toBe(16)
    expect(advance(at(15, { streak: -2 }), 'loss', 0).rung).toBe(13)
  })

  it('only drops into a lower band on the second loss in a row', () => {
    expect(advance(at(11), 'loss', 0).rung).toBe(11)
    expect(advance(at(11, { streak: -1 }), 'loss', 0).rung).toBe(10)
    expect(advance(at(11, { streak: -2 }), 'loss', 0).rung).toBe(9)
    expect(advance(at(12), 'loss', 0).rung).toBe(11)
    expect(advance(at(12, { streak: -1 }), 'loss', 0).rung).toBe(11)
    expect(advance(at(12, { streak: -2 }), 'loss', 0).rung).toBe(10)
    // A draw in between breaks the count: back to the first loss.
    expect(advance(advance(at(11, { streak: -1 }), 'draw', 0), 'loss', 0).rung).toBe(11)
  })

  it('keeps the rung on a draw at the top and only stamps the time', () => {
    expect(advance(at(30, { streak: 2 }), 'draw', 1000)).toEqual({ rung: 30, streak: 0, updatedAt: 1000 })
  })
})

describe('rungForSelection', () => {
  it('starts a first-ever game at the bottom of the picked band', () => {
    expect(rungForSelection(null, 'easy')).toBe(1)
    expect(rungForSelection(null, 'medium')).toBe(11)
    expect(rungForSelection(null, 'hard')).toBe(21)
  })

  it('leaves the rung alone when the picked band is the one it is in', () => {
    expect(rungForSelection(30, 'hard')).toBe(30)
    expect(rungForSelection(3, 'easy')).toBe(3)
  })

  it('nudges halfway to the middle of another band, rounding down', () => {
    expect(rungForSelection(25, 'easy')).toBe(15)
    expect(rungForSelection(25, 'medium')).toBe(20)
    expect(rungForSelection(3, 'hard')).toBe(14)
    expect(rungForSelection(3, 'medium')).toBe(9)
    expect(rungForSelection(30, 'easy')).toBe(17)
    expect(rungForSelection(12, 'hard')).toBe(18)
  })
})

describe('ladder storage', () => {
  it('reads an empty ladder when nothing is saved or the data is bad', () => {
    expect(loadLadder(fakeStorage())).toEqual(EMPTY_LADDER)
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: 'nope' }))).toEqual(EMPTY_LADDER)
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: '{"rung":99,"streak":"a"}' }))).toEqual(
      EMPTY_LADDER,
    )
  })

  it('round-trips a saved ladder', () => {
    const storage = fakeStorage()
    const ladder: Ladder = { rung: 17, streak: -2, updatedAt: 0 }
    saveLadder(storage, ladder)
    expect(loadLadder(storage)).toEqual(ladder)
  })

  it('drops the old top-draw fields from a ladder saved before they were removed', () => {
    const old = { rung: 30, streak: 0, topHeldAt: 1700000000000, topHeldCount: 3, updatedAt: 5 }
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: JSON.stringify(old) }))).toEqual({ rung: 30, streak: 0, updatedAt: 5 })
  })

  it('never throws when storage does', () => {
    const broken: HistoryStorage = {
      getItem: () => {
        throw new Error('no')
      },
      setItem: () => {
        throw new Error('no')
      },
      removeItem: () => {},
    }
    expect(loadLadder(broken)).toEqual(EMPTY_LADDER)
    expect(() => saveLadder(broken, at(1))).not.toThrow()
  })
})

describe('ladder timestamps', () => {
  it('stamps updatedAt when the ladder moves and reads legacy data as 0', () => {
    const moved = advance(EMPTY_LADDER, 'win', 777)
    expect(moved.updatedAt).toBe(777)
    const storage = { getItem: () => JSON.stringify({ rung: 5, streak: 1 }), setItem: () => {}, removeItem: () => {} }
    expect(loadLadder(storage).updatedAt).toBe(0)
    expect(EMPTY_LADDER.updatedAt).toBe(0)
  })

  it('prefers the newer copy, local on ties or when the cloud has none', () => {
    const local = { ...EMPTY_LADDER, rung: 7, updatedAt: 100 }
    const cloud = { ...EMPTY_LADDER, rung: 12, updatedAt: 200 }
    expect(newerLadder(local, cloud)).toBe(cloud)
    expect(newerLadder(local, { ...cloud, updatedAt: 100 })).toBe(local)
    expect(newerLadder(local, { ...cloud, updatedAt: 50 })).toBe(local)
    expect(newerLadder(local, null)).toBe(local)
  })
})

describe('suggestedBand', () => {
  it('is the band the saved rung sits in, and null before any ladder exists', () => {
    expect(suggestedBand(EMPTY_LADDER)).toBeNull()
    expect(suggestedBand({ ...EMPTY_LADDER, rung: 1 })).toBe('easy')
    expect(suggestedBand({ ...EMPTY_LADDER, rung: bandBottom('medium') })).toBe('medium')
    expect(suggestedBand({ ...EMPTY_LADDER, rung: TOP_RUNG })).toBe('hard')
  })
})
