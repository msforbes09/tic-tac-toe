import { describe, expect, it } from 'vitest'
import {
  EMPTY_LADDER,
  LADDER_KEY,
  TOP_RUNG,
  advance,
  bandOf,
  loadLadder,
  momentAfter,
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

  it('only drops into a lower band on the third loss in a row', () => {
    expect(advance(at(11), 'loss', 0).rung).toBe(11)
    expect(advance(at(11, { streak: -1 }), 'loss', 0).rung).toBe(11)
    expect(advance(at(11, { streak: -2 }), 'loss', 0).rung).toBe(9)
    expect(advance(at(12, { streak: -1 }), 'loss', 0).rung).toBe(11)
    expect(advance(at(12, { streak: -2 }), 'loss', 0).rung).toBe(10)
  })

  it('counts draws at the top and dates the first one', () => {
    const first = advance(at(30), 'draw', 1000)
    expect(first.topHeldAt).toBe(1000)
    expect(first.topHeldCount).toBe(1)
    const second = advance(first, 'draw', 2000)
    expect(second.topHeldAt).toBe(1000)
    expect(second.topHeldCount).toBe(2)
    expect(advance(at(29), 'draw', 3000).topHeldCount).toBe(0)
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
    expect(momentAfter(at(10), at(11), 'win')).toBe('promoted')
    expect(momentAfter(at(19, { streak: 2 }), at(21), 'win')).toBe('promoted')
  })

  it('says nothing for an ordinary rung change, a demotion, or a draw', () => {
    expect(momentAfter(at(12), at(13), 'win')).toBeNull()
    expect(momentAfter(at(11, { streak: -2 }), at(9), 'loss')).toBeNull()
    expect(momentAfter(at(15), at(15), 'draw')).toBeNull()
  })

  it('announces the top when a win reaches 30, every time', () => {
    expect(momentAfter(at(29), at(30), 'win')).toBe('top')
    expect(momentAfter(at(29, { topHeldAt: 1 }), at(30, { topHeldAt: 1 }), 'win')).toBe('top')
  })

  it('celebrates the first draw at 30 and only the first', () => {
    expect(momentAfter(at(30), at(30, { topHeldAt: 1, topHeldCount: 1 }), 'draw')).toBe('top-held')
    expect(momentAfter(at(30, { topHeldAt: 1, topHeldCount: 1 }), at(30, { topHeldAt: 1, topHeldCount: 2 }), 'draw')).toBeNull()
  })

  it('offers a rematch after a loss at the top', () => {
    expect(momentAfter(at(30), at(29, { streak: -1 }), 'loss')).toBe('lost-top')
  })
})

describe('ladder storage', () => {
  it('reads an empty ladder when nothing is saved or the data is bad', () => {
    expect(loadLadder(fakeStorage())).toEqual(EMPTY_LADDER)
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: 'nope' }))).toEqual(EMPTY_LADDER)
    expect(loadLadder(fakeStorage({ [LADDER_KEY]: '{"rung":99,"topHeldAt":"x","streak":"a","topHeldCount":-1}' }))).toEqual(
      EMPTY_LADDER,
    )
  })

  it('round-trips a saved ladder', () => {
    const storage = fakeStorage()
    const ladder: Ladder = { rung: 17, streak: -2, topHeldAt: 1700000000000, topHeldCount: 3 }
    saveLadder(storage, ladder)
    expect(loadLadder(storage)).toEqual(ladder)
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
