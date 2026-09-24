import { describe, expect, it, vi } from 'vitest'
import { createFakeRoom } from './roomConnection'
import type { Member, RoomMessage } from './room'

describe('fake room', () => {
  it('delivers messages to everyone else, not the sender', () => {
    const room = createFakeRoom()
    const host = room.join('host', 'h')
    const guest = room.join('guest', 'g')
    const seenByHost: RoomMessage[] = []
    const seenByGuest: RoomMessage[] = []
    host.onMessage((m) => seenByHost.push(m))
    guest.onMessage((m) => seenByGuest.push(m))
    guest.send({ type: 'move', index: 4 })
    expect(seenByHost).toEqual([{ type: 'move', index: 4 }])
    expect(seenByGuest).toEqual([])
  })

  it('tracks presence in join order and tells the others on join and leave', () => {
    const room = createFakeRoom()
    const host = room.join('host', 'h')
    const seen: Member[][] = []
    host.onPresence((members) => seen.push(members))
    const guest = room.join('guest', 'g')
    expect(host.members().map((m) => m.id)).toEqual(['h', 'g'])
    expect(host.members()[0].joinedAt).toBeLessThan(host.members()[1].joinedAt)
    expect(seen).toHaveLength(1)
    guest.leave()
    expect(host.members().map((m) => m.id)).toEqual(['h'])
    expect(seen).toHaveLength(2)
  })

  it('unsubscribes and stops delivering after leave', () => {
    const room = createFakeRoom()
    const host = room.join('host', 'h')
    const guest = room.join('guest', 'g')
    const handler = vi.fn()
    const off = host.onMessage(handler)
    off()
    guest.send({ type: 'new-game' })
    expect(handler).not.toHaveBeenCalled()
    const late = vi.fn()
    host.onMessage(late)
    host.leave()
    guest.send({ type: 'new-game' })
    expect(late).not.toHaveBeenCalled()
  })

  it('gives each member a distinct id when none is supplied', () => {
    const room = createFakeRoom()
    const a = room.join('host')
    const b = room.join('guest')
    expect(a.selfId).not.toBe(b.selfId)
  })
})
