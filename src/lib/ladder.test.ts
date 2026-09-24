import { describe, expect, it } from 'vitest'
import {
  LADDER_KEY,
  TOP_RUNG,
  bandOf,
  loadLadder,
  momentAfter,
  rungAfter,
  rungForSelection,
  saveLadder,
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

describe('rungAfter', () => {
  it('moves one rung: win up, loss down, draw stays', () => {
    expect(rungAfter(15, 'win')).toBe(16)
    expect(rungAfter(15, 'loss')).toBe(14)
    expect(rungAfter(15, 'draw')).toBe(15)
  })

  it('never leaves the ladder', () => {
    expect(rungAfter(30, 'win')).toBe(30)
    expect(rungAfter(1, 'loss')).toBe(1)
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

describe('momentAfter', () => {
  it('promotes when a win crosses into a higher band', () => {
    expect(momentAfter(10, 11, 'win', false)).toBe('promoted')
    expect(momentAfter(20, 21, 'win', false)).toBe('promoted')
  })

  it('says nothing for an ordinary rung change, a demotion, or a draw', () => {
    expect(momentAfter(12, 13, 'win', false)).toBeNull()
    expect(momentAfter(11, 10, 'loss', false)).toBeNull()
    expect(momentAfter(15, 15, 'draw', false)).toBeNull()
  })

  it('announces the top when a win reaches 30, every time', () => {
    expect(momentAfter(29, 30, 'win', false)).toBe('top')
    expect(momentAfter(29, 30, 'win', true)).toBe('top')
  })

  it('celebrates the first draw at 30 and only the first', () => {
    expect(momentAfter(30, 30, 'draw', false)).toBe('top-held')
    expect(momentAfter(30, 30, 'draw', true)).toBeNull()
  })
})

describe('ladder storage', () => {
  it('reads an empty ladder when nothing is saved or the data is bad', () => {
    expect(loadLadder(fakeStorage())).toEqual({ rung: null, topHeldAt: null })
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: 'nope' }))).toEqual({ rung: null, topHeldAt: null })
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: '{"rung":99,"topHeldAt":"x"}' }))).toEqual({
      rung: null,
      topHeldAt: null,
    })
  })

  it('round-trips a saved ladder', () => {
    const storage = fakeStorage()
    saveLadder(storage, { rung: 17, topHeldAt: 1700000000000 })
    expect(loadLadder(storage)).toEqual({ rung: 17, topHeldAt: 1700000000000 })
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
    expect(loadLadder(broken)).toEqual({ rung: null, topHeldAt: null })
    expect(() => saveLadder(broken, { rung: 1, topHeldAt: null })).not.toThrow()
  })
})
