import { describe, expect, it } from 'vitest'
import type { HistoryStorage } from './history'
import { REGISTERED_KEY, WIPE_KEYS, isRegistered, markRegistered, shouldWipe, wipeLocal } from './reset'

const memory = (): HistoryStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

describe('reset', () => {
  it('wipes only when the device registered before and the cloud row is gone', () => {
    expect(shouldWipe(true, null)).toBe(true)
    expect(shouldWipe(true, { id: 'd', nickname: 'n' })).toBe(false)
    expect(shouldWipe(false, null)).toBe(false)
  })

  it('remembers registration', () => {
    const s = memory()
    expect(isRegistered(s)).toBe(false)
    markRegistered(s)
    expect(isRegistered(s)).toBe(true)
    expect(s.data.get(REGISTERED_KEY)).toBe('1')
  })

  it('wipeLocal removes exactly the game data keys and leaves identity alone', () => {
    const s = memory()
    for (const k of WIPE_KEYS) s.setItem(k, 'x')
    s.setItem('tic-tac-toe:device', 'keep')
    s.setItem('tic-tac-toe:player-token', 'keep')
    wipeLocal(s)
    for (const k of WIPE_KEYS) expect(s.getItem(k)).toBeNull()
    expect(s.getItem('tic-tac-toe:device')).toBe('keep')
    expect(s.getItem('tic-tac-toe:player-token')).toBe('keep')
    expect(WIPE_KEYS).toEqual(
      expect.arrayContaining([
        'tic-tac-toe:history',
        'tic-tac-toe:ladder',
        'tic-tac-toe:achievements',
        'tic-tac-toe:setup',
        'tic-tac-toe:nickname',
        'tic-tac-toe:rooms-owned',
        'tic-tac-toe:show-hidden',
        'tic-tac-toe:registered',
      ]),
    )
  })
})
