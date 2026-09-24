import type { Connection, OpenChannel, Presence } from '@/lib/realtime'

const EVENT = 'msg'
const CONNECT_TIMEOUT_MS = 10_000

/** The slice of the Supabase Realtime client this adapter uses. Kept structural so tests can fake it. */
export type RealtimeChannelLike = {
  on(type: string, filter: Record<string, string>, callback: (payload: { payload?: unknown }) => void): RealtimeChannelLike
  subscribe(callback: (status: string, error?: Error) => void): unknown
  track(meta: unknown): Promise<unknown>
  send(message: { type: 'broadcast'; event: string; payload: unknown }): Promise<unknown>
  presenceState(): Record<string, unknown[]>
}
export type RealtimeClientLike = {
  channel(name: string, options: { config: { broadcast: { self: boolean }; presence: { key: string } } }): RealtimeChannelLike
  removeChannel(channel: RealtimeChannelLike): Promise<unknown>
}

/** One member per presence key; the first tracked meta wins. */
export function membersFromPresence<Meta>(state: Record<string, unknown[]>): Presence<Meta>[] {
  const members: Presence<Meta>[] = []
  for (const [id, metas] of Object.entries(state)) {
    if (metas.length === 0) continue
    members.push({ id, meta: metas[0] as Meta })
  }
  return members
}

type Facade = {
  onMessage: Set<(m: unknown) => void>
  onPresence: Set<(m: Presence<unknown>[]) => void>
}

/** One Supabase channel per topic, shared by every connection opened to it on this client. */
type Shared = {
  channel: RealtimeChannelLike
  facades: Set<Facade>
  members: Presence<unknown>[]
  lastMeta: unknown
  subscribed: boolean
  ready: Promise<void>
  /** Set once the last connection left; the topic is reusable when it resolves. */
  closing: Promise<void> | null
}

/**
 * Lobby, room, and game channels over Supabase Realtime: broadcast plus presence, no tables.
 * The client keeps one channel per topic, so two connections to the same topic (the room list and
 * a room both watching the lobby, or StrictMode's double mount) share it and the channel goes away
 * only when the last one leaves. Presence is re-tracked after every rejoin so a network blip does
 * not make a member vanish.
 */
export function createSupabaseRealtime(client: RealtimeClientLike): OpenChannel {
  const shared = new Map<string, Shared>()

  const create = (name: string, selfId: string): Shared => {
    const channel = client.channel(name, { config: { broadcast: { self: false }, presence: { key: selfId } } })
    const entry: Shared = { channel, facades: new Set(), members: [], lastMeta: undefined, subscribed: false, ready: Promise.resolve(), closing: null }

    channel.on('presence', { event: 'sync' }, () => {
      entry.members = membersFromPresence(channel.presenceState())
      for (const f of entry.facades) for (const h of f.onPresence) h(entry.members)
    })
    channel.on('broadcast', { event: EVENT }, ({ payload }) => {
      for (const f of entry.facades) for (const h of f.onMessage) h(payload)
    })

    entry.ready = new Promise<void>((resolve, reject) => {
      let settled = false
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        shared.delete(name)
        void client.removeChannel(channel)
        reject(error)
      }
      const timer = setTimeout(() => fail(new Error('Timed out connecting to the room')), CONNECT_TIMEOUT_MS)
      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          entry.subscribed = true
          if (entry.lastMeta !== undefined) void channel.track(entry.lastMeta)
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve()
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          entry.subscribed = false
          fail(error ?? new Error(status))
        } else if (status === 'CLOSED') {
          entry.subscribed = false
        }
      })
    })
    shared.set(name, entry)
    return entry
  }

  return async <Meta,>(name: string, selfId: string): Promise<Connection<Meta>> => {
    // The client hands back a channel that is still leaving if asked for the same topic too soon,
    // and subscribing to it never completes. Wait for the removal to finish first.
    const leaving = shared.get(name)
    if (leaving?.closing) await leaving.closing
    const entry = shared.get(name) ?? create(name, selfId)
    await entry.ready
    const facade: Facade = { onMessage: new Set(), onPresence: new Set() }
    entry.facades.add(facade)
    let left = false

    return {
      selfId,
      send: (message) => {
        if (!left) void entry.channel.send({ type: 'broadcast', event: EVENT, payload: message })
      },
      onMessage: (h) => {
        facade.onMessage.add(h)
        return () => facade.onMessage.delete(h)
      },
      track: (meta) => {
        if (left) return
        entry.lastMeta = meta
        if (entry.subscribed) void entry.channel.track(meta)
      },
      onPresence: (h) => {
        facade.onPresence.add(h as (m: Presence<unknown>[]) => void)
        return () => facade.onPresence.delete(h as (m: Presence<unknown>[]) => void)
      },
      members: () => entry.members as Presence<Meta>[],
      leave: () => {
        if (left) return
        left = true
        entry.facades.delete(facade)
        if (entry.facades.size === 0 && shared.get(name) === entry && !entry.closing) {
          const forget = () => {
            if (shared.get(name) === entry) shared.delete(name)
          }
          entry.closing = client.removeChannel(entry.channel).then(forget, forget)
        }
      },
    }
  }
}
