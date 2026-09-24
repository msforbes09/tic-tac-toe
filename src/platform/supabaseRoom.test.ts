import { describe, expect, it } from 'vitest'
import { membersFromPresence } from './supabaseRoom'

describe('membersFromPresence', () => {
  it('turns presence state into members and drops malformed entries', () => {
    const members = membersFromPresence({
      h: [{ role: 'host', joinedAt: 10 }],
      g: [
        { role: 'guest', joinedAt: 20 },
        { role: 'guest', joinedAt: 25 },
      ],
      junk: [{ role: 'spectator', joinedAt: 1 }],
      noTime: [{ role: 'guest' }],
      empty: [],
    })
    expect(members).toEqual([
      { id: 'h', role: 'host', joinedAt: 10 },
      { id: 'g', role: 'guest', joinedAt: 20 },
    ])
  })
})
