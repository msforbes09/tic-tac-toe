import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnlineGame } from './OnlineGame'
import type { Feedback } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import type { Role } from '@/lib/room'
import { createFakeRoom, type FakeRoom, type OpenRoom, type RoomConnection } from '@/lib/roomConnection'

const storage: HistoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const feedback: Feedback = { play: () => {} }
const share = vi.fn().mockResolvedValue('copied')

const immediate =
  (room: FakeRoom): OpenRoom =>
  (_code, role) =>
    Promise.resolve(room.join(role))

function renderSide(room: FakeRoom, role: Role, open: OpenRoom = immediate(room), onBack = vi.fn()) {
  const view = render(
    <div data-testid={role}>
      <OnlineGame
        code="AB2C"
        role={role}
        openRoom={open}
        storage={storage}
        feedback={feedback}
        share={share}
        baseUrl="https://x.test/app/"
        onBack={onBack}
      />
    </div>,
  )
  const el = () => view.container.firstElementChild as HTMLElement
  const button = (text: string) => Array.from(el().querySelectorAll('button')).find((b) => b.textContent === text)!
  const cell = (n: number) =>
    Array.from(el().querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.startsWith(`Cell ${n},`))!
  return { view, onBack, el, button, cell }
}

const flush = () => act(async () => {})

describe('OnlineGame', () => {
  it('host waits, then both play when the guest arrives', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host')
    expect(host.el()).toHaveTextContent('Connecting…')
    await flush()
    expect(host.el()).toHaveTextContent('Waiting for your friend…')
    expect(host.el()).toHaveTextContent('AB2C')
    const guest = renderSide(room, 'guest')
    await flush()
    expect(host.el()).toHaveTextContent('Your turn')
    expect(guest.el()).toHaveTextContent("Friend's turn")
    expect(room.members()).toHaveLength(2)
  })

  it('a third player finds the room full and leaves on Back', async () => {
    const room = createFakeRoom()
    renderSide(room, 'host')
    renderSide(room, 'guest')
    await flush()
    const third = renderSide(room, 'guest')
    await flush()
    expect(third.el()).toHaveTextContent('Room is full')
    fireEvent.click(third.button('Back'))
    expect(third.onBack).toHaveBeenCalled()
    third.view.unmount()
    expect(room.members()).toHaveLength(2)
  })

  it('a guest that first looked full plays once the earlier phantom guest leaves (StrictMode / quick rejoin)', async () => {
    const room = createFakeRoom()
    renderSide(room, 'host')
    const phantom = room.join('guest', 'phantom')
    const guest = renderSide(room, 'guest')
    await flush()
    expect(guest.el()).toHaveTextContent('Room is full')
    phantom.leave()
    await flush()
    expect(guest.el()).toHaveTextContent("Friend's turn")
  })

  it('a guest with no host waits and can cancel', async () => {
    const room = createFakeRoom()
    const guest = renderSide(room, 'guest')
    await flush()
    expect(guest.el()).toHaveTextContent('Waiting for your friend…')
    fireEvent.click(guest.button('Cancel'))
    expect(guest.onBack).toHaveBeenCalled()
    guest.view.unmount()
    expect(room.members()).toHaveLength(0)
  })

  it("shows Couldn't connect when the room cannot be opened", async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host', () => Promise.reject(new Error('offline')))
    await flush()
    expect(host.el()).toHaveTextContent("Couldn't connect")
  })

  it('the host stays in the game when the guest leaves and resumes when one returns', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host')
    const guest = renderSide(room, 'guest')
    await flush()
    fireEvent.click(host.cell(1))
    guest.view.unmount()
    await flush()
    expect(host.el()).toHaveTextContent('Your friend left')
    fireEvent.click(host.button('Wait'))
    const again = renderSide(room, 'guest')
    await flush()
    expect(host.el()).toHaveTextContent("Friend's turn")
    expect(again.cell(1)).toHaveAccessibleName('Cell 1, X')
  })

  it('the guest sees the friend-left notice when the host leaves', async () => {
    const room = createFakeRoom()
    const host = renderSide(room, 'host')
    const guest = renderSide(room, 'guest')
    await flush()
    host.view.unmount()
    await flush()
    expect(guest.el()).toHaveTextContent('Your friend left')
    expect(guest.button('Wait')).toBeUndefined()
  })

  it('closes a connection that resolves after cancelling', async () => {
    const room = createFakeRoom()
    let resolve!: (c: RoomConnection) => void
    const late: OpenRoom = () => new Promise((r) => (resolve = r))
    const host = renderSide(room, 'host', late)
    host.view.unmount()
    resolve(room.join('host'))
    await flush()
    expect(room.members()).toHaveLength(0)
  })
})
