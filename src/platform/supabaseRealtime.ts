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

/**
 * Lobby, room, and game channels over Supabase Realtime: broadcast plus presence, no tables.
 * Presence is re-tracked after every rejoin so a network blip does not make a member vanish.
 */
export function createSupabaseRealtime(client: RealtimeClientLike): OpenChannel {
  return <Meta,>(name: string, selfId: string) =>
    new Promise<Connection<Meta>>((resolve, reject) => {
      const channel = client.channel(name, { config: { broadcast: { self: false }, presence: { key: selfId } } })
      const messageHandlers = new Set<(m: unknown) => void>()
      const presenceHandlers = new Set<(m: Presence<Meta>[]) => void>()
      let members: Presence<Meta>[] = []
      let lastMeta: Meta | undefined
      let subscribed = false
      let settled = false

      channel.on('presence', { event: 'sync' }, () => {
        members = membersFromPresence<Meta>(channel.presenceState())
        for (const h of presenceHandlers) h(members)
      })
      channel.on('broadcast', { event: EVENT }, ({ payload }) => {
        for (const h of messageHandlers) h(payload)
      })

      const connection: Connection<Meta> = {
        selfId,
        send: (message) => {
          void channel.send({ type: 'broadcast', event: EVENT, payload: message })
        },
        onMessage: (h) => {
          messageHandlers.add(h)
          return () => messageHandlers.delete(h)
        },
        track: (meta) => {
          lastMeta = meta
          if (subscribed) void channel.track(meta)
        },
        onPresence: (h) => {
          presenceHandlers.add(h)
          return () => presenceHandlers.delete(h)
        },
        members: () => members,
        leave: () => {
          messageHandlers.clear()
          presenceHandlers.clear()
          void client.removeChannel(channel)
        },
      }

      const fail = (error: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        void client.removeChannel(channel)
        reject(error)
      }
      const timer = setTimeout(() => fail(new Error('Timed out connecting to the room')), CONNECT_TIMEOUT_MS)

      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          subscribed = true
          if (lastMeta !== undefined) void channel.track(lastMeta)
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(connection)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          subscribed = false
          fail(error ?? new Error(status))
        } else if (status === 'CLOSED') {
          subscribed = false
        }
      })
    })
}
