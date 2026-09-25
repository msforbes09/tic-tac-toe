import { describe, expect, it } from 'vitest'
import { TONE_KEY, loadTone, saveTone } from './tone'
import type { HistoryStorage } from './history'

function fakeStorage() {
  const map = new Map<string, string>()
  const storage: HistoryStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
  return storage
}

describe('tone storage', () => {
  it('is friendly until told otherwise', () => {
    expect(loadTone(fakeStorage())).toBe('friendly')
  })

  it('remembers cocky and back', () => {
    const storage = fakeStorage()
    saveTone(storage, 'cocky')
    expect(storage.getItem(TONE_KEY)).toBe('cocky')
    expect(loadTone(storage)).toBe('cocky')
    saveTone(storage, 'friendly')
    expect(loadTone(storage)).toBe('friendly')
  })

  it('falls back to friendly on junk', () => {
    const storage = fakeStorage()
    storage.setItem(TONE_KEY, 'rude')
    expect(loadTone(storage)).toBe('friendly')
  })

  it('survives a storage that throws', () => {
    const broken: HistoryStorage = {
      getItem: () => {
        throw new Error('nope')
      },
      setItem: () => {
        throw new Error('nope')
      },
      removeItem: () => {},
    }
    expect(loadTone(broken)).toBe('friendly')
    expect(() => saveTone(broken, 'cocky')).not.toThrow()
  })
})
