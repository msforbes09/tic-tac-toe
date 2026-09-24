/** One member of a channel, with the metadata it tracked. */
export type Presence<Meta> = { id: string; meta: Meta }

/** A member's view of one realtime channel: broadcast plus presence. */
export type Connection<Meta> = {
  readonly selfId: string
  send(message: unknown): void
  onMessage(handler: (message: unknown) => void): () => void
  /** Announce (or replace) this member's presence metadata. */
  track(meta: Meta): void
  onPresence(handler: (members: Presence<Meta>[]) => void): () => void
  /** Members who have tracked presence, in arrival order. */
  members(): Presence<Meta>[]
  leave(): void
}

export type OpenChannel = <Meta>(name: string, selfId: string) => Promise<Connection<Meta>>

export type FakeRealtime = {
  open: OpenChannel
  /** Members currently on a channel, for assertions. */
  membersOf(name: string): Presence<unknown>[]
  /** Simulate a network drop for one member of one channel: presence gone, messages stop, it is not told. */
  drop(name: string, selfId: string): void
}

type Peer = {
  id: string
  meta: unknown
  tracked: boolean
  alive: boolean
  onMessage: Set<(m: unknown) => void>
  onPresence: Set<(members: Presence<unknown>[]) => void>
}

/** Links connections in memory, synchronously. For tests. */
export function createFakeRealtime(): FakeRealtime {
  const channels = new Map<string, Peer[]>()
  const peersOf = (name: string): Peer[] => {
    let list = channels.get(name)
    if (!list) {
      list = []
      channels.set(name, list)
    }
    return list
  }
  const membersOf = (name: string): Presence<unknown>[] =>
    peersOf(name)
      .filter((p) => p.alive && p.tracked)
      .map((p) => ({ id: p.id, meta: p.meta }))
  const announce = (name: string) => {
    const snapshot = membersOf(name)
    for (const p of peersOf(name)) if (p.alive) for (const h of p.onPresence) h(snapshot)
  }
  const remove = (name: string, peer: Peer) => {
    peer.alive = false
    const list = peersOf(name)
    const at = list.indexOf(peer)
    if (at >= 0) list.splice(at, 1)
    announce(name)
  }

  return {
    membersOf,
    drop(name, selfId) {
      const peer = peersOf(name).find((p) => p.id === selfId)
      if (peer) remove(name, peer)
    },
    open: async <Meta,>(name: string, selfId: string): Promise<Connection<Meta>> => {
      const peer: Peer = { id: selfId, meta: undefined, tracked: false, alive: true, onMessage: new Set(), onPresence: new Set() }
      peersOf(name).push(peer)
      return {
        selfId,
        send(message) {
          if (!peer.alive) return
          for (const p of peersOf(name)) if (p !== peer && p.alive) for (const h of p.onMessage) h(message)
        },
        onMessage(handler) {
          peer.onMessage.add(handler)
          return () => peer.onMessage.delete(handler)
        },
        track(meta) {
          if (!peer.alive) return
          peer.meta = meta
          peer.tracked = true
          announce(name)
        },
        onPresence(handler) {
          peer.onPresence.add(handler as (members: Presence<unknown>[]) => void)
          return () => peer.onPresence.delete(handler as (members: Presence<unknown>[]) => void)
        },
        members: () => membersOf(name) as Presence<Meta>[],
        leave() {
          if (!peer.alive) return
          remove(name, peer)
          peer.onMessage.clear()
          peer.onPresence.clear()
        },
      }
    },
  }
}
