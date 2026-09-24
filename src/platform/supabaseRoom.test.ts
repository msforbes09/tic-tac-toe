import { beforeEach, describe, expect, it, vi } from 'vitest'

type SubscribeCallback = (status: string, error?: Error) => void

// A stand-in for the Realtime client: enough surface for openSupabaseRoom, with spies on teardown.
const fake = {
  subscribeStatus: 'SUBSCRIBED',
  removeChannel: vi.fn(),
  disconnect: vi.fn(),
  track: vi.fn(async () => 'ok'),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => {},
      presenceState: () => ({}),
      subscribe: (cb: SubscribeCallback) => {
        queueMicrotask(() => cb(fake.subscribeStatus, fake.subscribeStatus === 'SUBSCRIBED' ? undefined : new Error('nope')))
      },
      track: fake.track,
      send: async () => 'ok',
    }),
    removeChannel: fake.removeChannel,
    realtime: { disconnect: fake.disconnect },
  }),
}))

const { createSupabaseOpenRoom, membersFromPresence } = await import('./supabaseRoom')
const config = { url: 'https://p.supabase.co', anonKey: 'key' }

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

describe('openSupabaseRoom teardown', () => {
  beforeEach(() => {
    fake.subscribeStatus = 'SUBSCRIBED'
    fake.removeChannel.mockClear()
    fake.disconnect.mockClear()
  })

  it('tracks presence once subscribed', async () => {
    await createSupabaseOpenRoom(config)('AB2C', 'host')
    expect(fake.track).toHaveBeenCalledWith(expect.objectContaining({ role: 'host' }))
  })

  it('leave removes the channel and closes the socket so nothing keeps reconnecting', async () => {
    const conn = await createSupabaseOpenRoom(config)('AB2C', 'host')
    conn.leave()
    expect(fake.removeChannel).toHaveBeenCalledTimes(1)
    expect(fake.disconnect).toHaveBeenCalledTimes(1)
  })

  it('a failed subscribe rejects and closes the socket', async () => {
    fake.subscribeStatus = 'CHANNEL_ERROR'
    await expect(createSupabaseOpenRoom(config)('AB2C', 'guest')).rejects.toThrow()
    expect(fake.disconnect).toHaveBeenCalledTimes(1)
  })
})
