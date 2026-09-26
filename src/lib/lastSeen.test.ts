import { describe, expect, it } from 'vitest'
import { lastSeenLabel } from './lastSeen'

const MIN = 60_000
const NOW = 1_800_000_000_000

describe('lastSeenLabel', () => {
  it('says just now under a minute, and for a clock slightly ahead', () => {
    expect(lastSeenLabel(NOW - 59_000, NOW)).toBe('just now')
    expect(lastSeenLabel(NOW + 5_000, NOW)).toBe('just now')
  })

  it('counts minutes, then hours, then days, rounding down', () => {
    expect(lastSeenLabel(NOW - MIN, NOW)).toBe('1 min ago')
    expect(lastSeenLabel(NOW - 59 * MIN, NOW)).toBe('59 min ago')
    expect(lastSeenLabel(NOW - 60 * MIN, NOW)).toBe('1 h ago')
    expect(lastSeenLabel(NOW - 23 * 60 * MIN - 59 * MIN, NOW)).toBe('23 h ago')
    expect(lastSeenLabel(NOW - 24 * 60 * MIN, NOW)).toBe('1 day ago')
    expect(lastSeenLabel(NOW - 400 * 24 * 60 * MIN, NOW)).toBe('400 days ago')
  })
})
