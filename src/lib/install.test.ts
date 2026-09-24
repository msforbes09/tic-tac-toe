import { describe, expect, it } from 'vitest'
import {
  INSTALL_DISMISSED_KEY,
  INSTALL_SNOOZE_MS,
  installNudge,
  loadInstallDismissedAt,
  saveInstallDismissedAt,
} from './install'
import type { HistoryStorage } from './history'

const base = { standalone: false, promptAvailable: false, ios: false, dismissedAt: null, now: 1_000_000 }

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

describe('installNudge', () => {
  it('offers the one-tap install when the browser can prompt', () => {
    expect(installNudge({ ...base, promptAvailable: true })).toBe('prompt')
  })

  it('shows the Share → Add to Home Screen steps on iPhone and iPad', () => {
    expect(installNudge({ ...base, ios: true })).toBe('ios-steps')
  })

  it('is hidden once installed, in browsers that cannot install, and while snoozed', () => {
    expect(installNudge({ ...base, promptAvailable: true, standalone: true })).toBe('hidden')
    expect(installNudge({ ...base, ios: true, standalone: true })).toBe('hidden')
    expect(installNudge(base)).toBe('hidden')
    expect(installNudge({ ...base, promptAvailable: true, dismissedAt: base.now - 1000 })).toBe('hidden')
    expect(installNudge({ ...base, promptAvailable: true, dismissedAt: base.now - INSTALL_SNOOZE_MS - 1 })).toBe('prompt')
  })
})

describe('install dismissal memory', () => {
  it('round-trips the dismissal time', () => {
    const storage = fakeStorage()
    expect(loadInstallDismissedAt(storage)).toBeNull()
    saveInstallDismissedAt(storage, 1234)
    expect(storage.getItem(INSTALL_DISMISSED_KEY)).toBe('1234')
    expect(loadInstallDismissedAt(storage)).toBe(1234)
  })

  it('ignores garbage and survives storage that throws', () => {
    expect(loadInstallDismissedAt(fakeStorage({ [INSTALL_DISMISSED_KEY]: 'soon' }))).toBeNull()
    const broken: HistoryStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {},
    }
    expect(loadInstallDismissedAt(broken)).toBeNull()
    expect(() => saveInstallDismissedAt(broken, 1)).not.toThrow()
  })
})
