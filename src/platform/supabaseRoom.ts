import { createClient } from '@supabase/supabase-js'
import { newEntryId } from '@/lib/history'
import { isRoomMessage, type Member, type Role, type RoomMessage, type SupabaseConfig } from '@/lib/room'
import type { OpenRoom, RoomConnection } from '@/lib/roomConnection'

const CONNECT_TIMEOUT_MS = 10_000
const EVENT = 'msg'

type PresenceMeta = { role?: unknown; joinedAt?: unknown }

/** One member per presence key; the first tracked meta wins. */
export function membersFromPresence(state: Record<string, PresenceMeta[]>): Member[] {
  const members: Member[] = []
  for (const [id, metas] of Object.entries(state)) {
    const meta = metas[0]
    if (!meta) continue
    if ((meta.role !== 'host' && meta.role !== 'guest') || typeof meta.joinedAt !== 'number') continue
    members.push({ id, role: meta.role, joinedAt: meta.joinedAt })
  }
  return members
}

/** Realtime broadcast + presence on channel `ttt-room:<CODE>`. No tables, no auth. */
export function createSupabaseOpenRoom(config: SupabaseConfig): OpenRoom {
  return (code: string, role: Role) =>
    new Promise<RoomConnection>((resolve, reject) => {
      const client = createClient(config.url, config.anonKey, { auth: { persistSession: false } })
      const selfId = newEntryId()
      const channel = client.channel(`ttt-room:${code}`, {
        config: { broadcast: { self: false }, presence: { key: selfId } },
      })
      const messageHandlers = new Set<(m: RoomMessage) => void>()
      const presenceHandlers = new Set<(m: Member[]) => void>()
      let members: Member[] = []
      let settled = false

      channel.on('presence', { event: 'sync' }, () => {
        members = membersFromPresence(channel.presenceState<PresenceMeta>())
        for (const h of presenceHandlers) h(members)
      })
      channel.on('broadcast', { event: EVENT }, ({ payload }) => {
        if (isRoomMessage(payload)) for (const h of messageHandlers) h(payload)
      })

      const connection: RoomConnection = {
        selfId,
        send: (message) => {
          void channel.send({ type: 'broadcast', event: EVENT, payload: message })
        },
        onMessage: (h) => {
          messageHandlers.add(h)
          return () => messageHandlers.delete(h)
        },
        onPresence: (h) => {
          presenceHandlers.add(h)
          return () => presenceHandlers.delete(h)
        },
        members: () => members,
        leave: () => {
          void client.removeChannel(channel)
        },
      }

      const fail = (error: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        connection.leave()
        reject(error)
      }
      const timer = setTimeout(() => fail(new Error('Timed out connecting to the room')), CONNECT_TIMEOUT_MS)

      channel.subscribe(async (status, error) => {
        if (status === 'SUBSCRIBED') {
          if (settled) return
          settled = true
          clearTimeout(timer)
          await channel.track({ role, joinedAt: Date.now() })
          resolve(connection)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          fail(error ?? new Error(status))
        }
      })
    })
}
