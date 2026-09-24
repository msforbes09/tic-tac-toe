import { describe, expect, it } from 'vitest'
import { DEV_MODE_KEY, KNOCK, KNOCK_DELAY_MS, knockStep, loadDevMode, saveDevMode, type KnockEvent } from './knock'
import type { HistoryStorage } from './history'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const storage: HistoryStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
  return storage
}

describe('the knock', () => {
  it('is the owner’s sequence across setup, History, and the board', () => {
    expect(KNOCK).toEqual<KnockEvent[]>([
      'mode:pvp',
      'mode:bot',
      'mode:pvp',
      'history:open',
      'history:back',
      'start',
      'cell:0',
      'cell:4',
      'cell:8',
      'cell:2',
      'cell:4',
    ])
    expect(KNOCK_DELAY_MS).toBe(2000)
  })

  it('advances one step per matching event and completes at the end', () => {
    let progress = 0
    for (const event of KNOCK) progress = knockStep(progress, event)
    expect(progress).toBe(KNOCK.length)
  })

  it('resets on a wrong event, or restarts if that event is the first step', () => {
    expect(knockStep(3, 'cell:0')).toBe(0)
    expect(knockStep(3, 'mode:pvp')).toBe(1)
    expect(knockStep(0, 'start')).toBe(0)
  })
})

describe('developer mode flag', () => {
  it('is off by default and round-trips', () => {
    const storage = fakeStorage()
    expect(loadDevMode(storage)).toBe(false)
    saveDevMode(storage, true)
    expect(loadDevMode(storage)).toBe(true)
    expect(storage.getItem(DEV_MODE_KEY)).toBe('1')
    saveDevMode(storage, false)
    expect(loadDevMode(storage)).toBe(false)
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
    expect(loadDevMode(broken)).toBe(false)
    expect(() => saveDevMode(broken, true)).not.toThrow()
  })
})
