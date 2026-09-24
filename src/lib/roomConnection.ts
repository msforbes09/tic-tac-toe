import type { Member, Role, RoomMessage } from './room'

/** One member's view of a room. Broadcast messages plus who is present. */
export type RoomConnection = {
  readonly selfId: string
  send(message: RoomMessage): void
  onMessage(handler: (message: RoomMessage) => void): () => void
  onPresence(handler: (members: Member[]) => void): () => void
  /** The members present right now. */
  members(): Member[]
  leave(): void
}

export type OpenRoom = (code: string, role: Role) => Promise<RoomConnection>

export type FakeRoom = { join(role: Role, id?: string): RoomConnection; members(): Member[] }

type Peer = {
  member: Member
  onMessage: Set<(m: RoomMessage) => void>
  onPresence: Set<(m: Member[]) => void>
}

/** Links connections in memory, synchronously. For tests. */
export function createFakeRoom(): FakeRoom {
  const peers: Peer[] = []
  let clock = 0
  let nextId = 0
  const members = () => peers.map((p) => p.member)
  const announce = () => {
    const snapshot = members()
    for (const p of peers) for (const h of p.onPresence) h(snapshot)
  }

  return {
    members,
    join(role, id = `member-${++nextId}`) {
      const peer: Peer = { member: { id, role, joinedAt: ++clock }, onMessage: new Set(), onPresence: new Set() }
      peers.push(peer)
      announce()
      return {
        selfId: id,
        send(message) {
          for (const p of peers) if (p !== peer) for (const h of p.onMessage) h(message)
        },
        onMessage(handler) {
          peer.onMessage.add(handler)
          return () => peer.onMessage.delete(handler)
        },
        onPresence(handler) {
          peer.onPresence.add(handler)
          return () => peer.onPresence.delete(handler)
        },
        members,
        leave() {
          const at = peers.indexOf(peer)
          if (at < 0) return
          peers.splice(at, 1)
          peer.onMessage.clear()
          peer.onPresence.clear()
          announce()
        },
      }
    },
  }
}
