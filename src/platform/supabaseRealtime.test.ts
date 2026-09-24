import { describe, expect, it, vi } from 'vitest'
import { createSupabaseRealtime, membersFromPresence, type RealtimeClientLike } from './supabaseRealtime'

type SubscribeCallback = (status: string, error?: Error) => void

/** A stand-in for the Supabase client: one channel at a time, with spies on what matters. */
function fakeClient(options: { holdRemoves?: boolean } = {}) {
  const removeResolvers: (() => void)[] = []
  const handlers: Record<string, ((payload: unknown) => void)[]> = { broadcast: [], presence: [] }
  let subscribeCb: SubscribeCallback | null = null
  let presence: Record<string, unknown[]> = {}
  const channel = {
    on: vi.fn((type: string, _filter: unknown, cb: (payload: unknown) => void) => {
      handlers[type]?.push(cb)
      return channel
    }),
    subscribe: vi.fn((cb: SubscribeCallback) => {
      subscribeCb = cb
      return channel
    }),
    track: vi.fn(async () => 'ok'),
    send: vi.fn(async () => 'ok'),
    presenceState: () => presence,
  }
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(() =>
      options.holdRemoves ? new Promise<void>((r) => removeResolvers.push(r)) : Promise.resolve(),
    ),
  }
  return {
    finishRemoves: () => {
      for (const r of removeResolvers.splice(0)) r()
    },
    client: client as unknown as RealtimeClientLike,
    channel,
    status: (s: string, error?: Error) => subscribeCb?.(s, error),
    broadcast: (payload: unknown) => handlers.broadcast.forEach((h) => h({ payload })),
    syncPresence: (state: Record<string, unknown[]>) => {
      presence = state
      handlers.presence.forEach((h) => h({}))
    },
  }
}

describe('membersFromPresence', () => {
  it('keeps the first meta per key and skips empty keys', () => {
    expect(membersFromPresence({ a: [{ x: 1 }, { x: 2 }], b: [], c: [{ y: 3 }] })).toEqual([
      { id: 'a', meta: { x: 1 } },
      { id: 'c', meta: { y: 3 } },
    ])
  })
})

describe('createSupabaseRealtime', () => {
  it('opens after SUBSCRIBED, tracks metadata, and re-tracks it after a rejoin', async () => {
    const f = fakeClient()
    const open = createSupabaseRealtime(f.client)
    const pending = open<{ role: string }>('ttt-game:G1', 'dev-1')
    expect(f.client.channel).toHaveBeenCalledWith('ttt-game:G1', { config: { broadcast: { self: false }, presence: { key: 'dev-1' } } })
    f.status('SUBSCRIBED')
    const conn = await pending
    conn.track({ role: 'referee' })
    expect(f.channel.track).toHaveBeenCalledWith({ role: 'referee' })
    f.status('SUBSCRIBED')
    await Promise.resolve()
    expect(f.channel.track).toHaveBeenCalledTimes(2)
  })

  it('passes broadcast payloads through raw and maps presence to members', async () => {
    const f = fakeClient()
    const pending = createSupabaseRealtime(f.client)<{ n: number }>('ttt-room:R1', 'dev-1')
    f.status('SUBSCRIBED')
    const conn = await pending
    const seen = vi.fn()
    const present = vi.fn()
    conn.onMessage(seen)
    conn.onPresence(present)
    f.broadcast({ type: 'hello', from: 'x' })
    expect(seen).toHaveBeenCalledWith({ type: 'hello', from: 'x' })
    f.syncPresence({ 'dev-1': [{ n: 1 }], 'dev-2': [{ n: 2 }] })
    expect(present).toHaveBeenCalledWith([
      { id: 'dev-1', meta: { n: 1 } },
      { id: 'dev-2', meta: { n: 2 } },
    ])
    expect(conn.members()).toHaveLength(2)
    conn.send({ type: 'hello', from: 'dev-1' })
    expect(f.channel.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'msg', payload: { type: 'hello', from: 'dev-1' } })
  })

  it('leave removes the channel; a failed subscribe rejects and removes it too', async () => {
    const f = fakeClient()
    const pending = createSupabaseRealtime(f.client)<object>('ttt-room:R1', 'dev-1')
    f.status('SUBSCRIBED')
    const conn = await pending
    conn.leave()
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1)

    const g = fakeClient()
    const failing = createSupabaseRealtime(g.client)<object>('ttt-room:R2', 'dev-1')
    g.status('CHANNEL_ERROR', new Error('nope'))
    await expect(failing).rejects.toThrow('nope')
    expect(g.client.removeChannel).toHaveBeenCalledTimes(1)
  })

  it('shares one Supabase channel per topic and removes it only when the last connection leaves', async () => {
    const f = fakeClient()
    const open = createSupabaseRealtime(f.client)
    const first = open<{ n: number }>('ttt-lobby', 'dev-1')
    f.status('SUBSCRIBED')
    const a = await first
    const b = await open<{ n: number }>('ttt-lobby', 'dev-1')
    expect(f.client.channel).toHaveBeenCalledTimes(1)
    const seenA = vi.fn()
    const seenB = vi.fn()
    a.onMessage(seenA)
    b.onMessage(seenB)
    f.broadcast({ hi: 1 })
    expect(seenA).toHaveBeenCalledWith({ hi: 1 })
    expect(seenB).toHaveBeenCalledWith({ hi: 1 })
    b.track({ n: 2 })
    expect(f.channel.track).toHaveBeenCalledWith({ n: 2 })
    a.leave()
    expect(f.client.removeChannel).not.toHaveBeenCalled()
    f.broadcast({ hi: 2 })
    expect(seenA).toHaveBeenCalledTimes(1)
    expect(seenB).toHaveBeenCalledTimes(2)
    b.leave()
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1)
    // A fresh open after everyone left makes a new channel, once the old one is gone.
    const again = open<{ n: number }>('ttt-lobby', 'dev-1')
    await new Promise((r) => setTimeout(r, 0))
    f.status('SUBSCRIBED')
    await again
    expect(f.client.channel).toHaveBeenCalledTimes(2)
  })

  it('waits for a leaving channel to be removed before reopening its topic', async () => {
    const f = fakeClient({ holdRemoves: true })
    const open = createSupabaseRealtime(f.client)
    const first = open<object>('ttt-lobby', 'dev-1')
    f.status('SUBSCRIBED')
    const a = await first
    a.leave()
    expect(f.client.removeChannel).toHaveBeenCalledTimes(1)
    let reopened = false
    const again = open<object>('ttt-lobby', 'dev-1').then((c) => {
      reopened = true
      return c
    })
    await new Promise((r) => setTimeout(r, 0))
    // Still leaving: no second channel yet, and the client's leaving channel is not reused.
    expect(f.client.channel).toHaveBeenCalledTimes(1)
    f.finishRemoves()
    await new Promise((r) => setTimeout(r, 0))
    expect(f.client.channel).toHaveBeenCalledTimes(2)
    f.status('SUBSCRIBED')
    await again
    expect(reopened).toBe(true)
  })
})
