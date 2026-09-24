import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomScreen } from './RoomScreen'
import type { Feedback, FeedbackEvent } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import { createFakeRealtime, type FakeRealtime, type OpenChannel } from '@/lib/realtime'
import { CHALLENGE_TIMEOUT_MS, LOBBY_CHANNEL, roomChannel } from '@/lib/room'
import { createFakeDirectory, type RoomDirectory, type RoomRecord } from '@/lib/roomDirectory'

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const cat = { deviceId: 'c', nickname: 'Cat' }
const room: RoomRecord = { id: 'R1', name: 'Sly Diagonal', creatorId: 'a', createdAt: 1 }
const hash = async (t: string) => `h:${t}`
const storage: HistoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const flush = () => act(async () => {})

let nextId = 0

function mount(rt: FakeRealtime, dir: RoomDirectory, self: typeof alice, ownerToken: string | null = null) {
  const onLeave = vi.fn()
  const played: FeedbackEvent[] = []
  const feedback: Feedback = { play: (e) => void played.push(e) }
  const view = render(
    <div data-testid={self.deviceId}>
      <RoomScreen
        room={room}
        self={self}
        ownerToken={ownerToken}
        open={rt.open}
        directory={dir}
        storage={storage}
        feedback={feedback}
        onLeave={onLeave}
        newId={() => `g${++nextId}`}
      />
    </div>,
  )
  const el = () => screen.getByTestId(self.deviceId)
  const buttons = () => Array.from(el().querySelectorAll('button'))
  const button = (text: RegExp) => buttons().find((b) => text.test(b.textContent ?? ''))
  return { el, button, onLeave, played, unmount: () => view.unmount() }
}

async function setup(withCat = false) {
  const rt = createFakeRealtime()
  const dir = createFakeDirectory(hash)
  await dir.createRoom({ id: room.id, name: room.name, creatorId: 'a', ownerHash: await hash('token-a') })
  const a = mount(rt, dir, alice, 'token-a')
  const b = mount(rt, dir, bob)
  const c = withCat ? mount(rt, dir, cat) : null
  await flush()
  return { rt, dir, a, b, c }
}

/** Alice challenges Bob, Bob accepts. */
async function startSeries(a: ReturnType<typeof mount>) {
  fireEvent.click(a.button(/^challenge$/i)!)
  await flush()
  fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
  await flush()
}

describe('RoomScreen people and presence', () => {
  it('lists members with status and a Challenge button beside the others', async () => {
    const { rt, a, b } = await setup()
    expect(a.el()).toHaveTextContent('Sly Diagonal')
    expect(a.el()).toHaveTextContent('Bob')
    expect(a.el()).toHaveTextContent('Idle')
    expect(a.el()).toHaveTextContent('You')
    expect(Array.from(a.el().querySelectorAll('button')).filter((x) => /^challenge$/i.test(x.textContent ?? ''))).toHaveLength(1)
    expect(b.button(/^challenge$/i)).toBeDefined()
    const lobby = rt.membersOf(LOBBY_CHANNEL).map((m) => m.meta)
    expect(lobby).toEqual(expect.arrayContaining([{ roomId: 'R1', nickname: 'Alice' }, { roomId: 'R1', nickname: 'Bob' }]))
  })

  it('Leave calls back and clears presence; only the owner sees Delete room', async () => {
    const { rt, a, b } = await setup()
    expect(a.button(/delete room/i)).toBeDefined()
    expect(b.button(/delete room/i)).toBeUndefined()
    fireEvent.click(b.button(/leave/i)!)
    expect(b.onLeave).toHaveBeenCalledWith()
    b.unmount()
    await flush()
    expect(rt.membersOf(LOBBY_CHANNEL).map((m) => m.id)).toEqual(['a'])
    expect(a.el()).not.toHaveTextContent('Bob')
  })
})

describe('RoomScreen challenges', () => {
  it('challenge → waiting with Cancel; decline clears it', async () => {
    const { a, b } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    expect(a.el()).toHaveTextContent('Waiting for Bob…')
    expect(a.button(/^cancel$/i)).toBeDefined()
    expect(screen.getByText('Alice challenges you')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^decline$/i }))
    await flush()
    expect(a.el()).not.toHaveTextContent('Waiting for Bob…')
    expect(screen.queryByText('Alice challenges you')).not.toBeInTheDocument()
    void b
  })

  it('cancel withdraws the challenge on both sides', async () => {
    const { a } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    fireEvent.click(a.button(/^cancel$/i)!)
    await flush()
    expect(screen.queryByText('Alice challenges you')).not.toBeInTheDocument()
    expect(a.el()).not.toHaveTextContent('Waiting for Bob…')
  })

  it('accept starts the series for both, shows the vs splash to the third member, and Watch joins it', async () => {
    const { a, b, c } = await setup(true)
    await startSeries(a)
    expect(a.el()).toHaveTextContent('You 0 · 0 Bob')
    expect(b.el()).toHaveTextContent('Alice 0 · 0 You')
    expect(c!.el()).toHaveTextContent('Alice vs Bob')
    fireEvent.click(c!.button(/^watch$/i)!)
    await flush()
    expect(c!.el()).toHaveTextContent('Watching')
    expect(c!.el()).toHaveTextContent('Alice 0 · 0 Bob')
  })

  it('Dismiss keeps the third member in the room, with the game listed and playing members unchallengeable', async () => {
    const { a, c } = await setup(true)
    await startSeries(a)
    fireEvent.click(c!.button(/^dismiss$/i)!)
    await flush()
    expect(c!.el()).toHaveTextContent('Alice vs Bob')
    expect(c!.el()).toHaveTextContent('Playing')
    const challengeButtons = Array.from(c!.el().querySelectorAll('button')).filter((x) => /^challenge$/i.test(x.textContent ?? ''))
    expect(challengeButtons).toHaveLength(2)
    for (const x of challengeButtons) expect(x).toBeDisabled()
    expect(c!.button(/^watch$/i)).toBeDefined()
  })

  it('a finished series shows up in Results after Back to room', async () => {
    const { a, b } = await setup()
    await startSeries(a)
    fireEvent.click(b.button(/^resign$/i)!)
    fireEvent.click(screen.getByRole('button', { name: /yes, resign/i }))
    await flush()
    fireEvent.click(a.button(/back to room/i)!)
    fireEvent.click(b.button(/back to room/i)!)
    await flush()
    expect(a.el()).toHaveTextContent('Bob resigned to Alice at 0–0')
    expect(b.el()).toHaveTextContent('Bob resigned to Alice at 0–0')
    expect(a.el()).toHaveTextContent('Idle')
    expect(a.button(/^challenge$/i)).not.toBeDisabled()
  })
})

describe('RoomScreen challenge sounds and disconnects', () => {
  it('plays a chime for the challenged player and a cue for the challenger on accept', async () => {
    const { a, b } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    expect(b.played).toContainEqual({ kind: 'challenge' })
    expect(a.played).not.toContainEqual({ kind: 'challenge' })
    fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
    await flush()
    expect(a.played).toContainEqual({ kind: 'accepted' })
  })

  it('closes a pending challenge when the challenged player disconnects', async () => {
    const { a, b } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    expect(a.el()).toHaveTextContent('Waiting for Bob…')
    b.unmount()
    await flush()
    expect(a.el()).not.toHaveTextContent('Waiting for Bob…')
    expect(a.el()).toHaveTextContent('Bob left before answering')
  })

  it('closes the challenge sheet when the challenger disconnects', async () => {
    const { a } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    expect(screen.getByText('Alice challenges you')).toBeInTheDocument()
    a.unmount()
    await flush()
    expect(screen.queryByText('Alice challenges you')).not.toBeInTheDocument()
  })
})

describe('RoomScreen timeouts and deletion', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('an unanswered challenge expires', async () => {
    const { a } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    expect(a.el()).toHaveTextContent('Waiting for Bob…')
    act(() => vi.advanceTimersByTime(CHALLENGE_TIMEOUT_MS))
    await flush()
    expect(a.el()).not.toHaveTextContent('Waiting for Bob…')
    expect(screen.queryByText('Alice challenges you')).not.toBeInTheDocument()
  })

  it('the owner deletes the room and everyone is sent back with a notice', async () => {
    const { dir, a, b } = await setup()
    fireEvent.click(a.button(/delete room/i)!)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    await flush()
    await flush()
    expect(dir.rooms()).toEqual([])
    expect(b.onLeave).toHaveBeenCalledWith('The room was deleted')
    expect(a.onLeave).toHaveBeenCalled()
  })

  it('an incoming challenge that is never cancelled still expires on the target', async () => {
    const { rt, b } = await setup()
    const raw = await rt.open(roomChannel('R1'), 'z')
    raw.track({ deviceId: 'z', nickname: 'Zed', status: 'idle', gameId: null })
    raw.send({ type: 'challenge', gameId: 'gz', from: { deviceId: 'z', nickname: 'Zed' }, to: 'b' })
    await flush()
    expect(screen.getByText('Zed challenges you')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(CHALLENGE_TIMEOUT_MS))
    await flush()
    expect(screen.queryByText('Zed challenges you')).not.toBeInTheDocument()
    void b
  })

  it('an accept for a challenge that no longer exists is answered with a cancel', async () => {
    const { rt } = await setup()
    const raw = await rt.open(roomChannel('R1'), 'z')
    const seen = vi.fn()
    raw.onMessage(seen)
    raw.send({ type: 'accept', gameId: 'ghost', from: 'z', to: 'a' })
    await flush()
    expect(seen).toHaveBeenCalledWith({ type: 'cancel', gameId: 'ghost', from: 'a' })
    expect(seen).not.toHaveBeenCalledWith({ type: 'cancel', gameId: 'ghost', from: 'b' })
  })

  it('a challenge arriving while you have one pending is declined, so crossing challenges cannot both start', async () => {
    const { rt, a } = await setup()
    fireEvent.click(a.button(/^challenge$/i)!)
    await flush()
    const raw = await rt.open(roomChannel('R1'), 'z')
    const seen = vi.fn()
    raw.onMessage(seen)
    raw.send({ type: 'challenge', gameId: 'gz', from: { deviceId: 'z', nickname: 'Zed' }, to: 'a' })
    await flush()
    expect(seen).toHaveBeenCalledWith({ type: 'decline', gameId: 'gz', from: 'a' })
    expect(screen.queryByText('Zed challenges you')).not.toBeInTheDocument()
  })
})

describe('RoomScreen stability', () => {
  it('re-rendering with fresh prop objects does not reopen the channels', async () => {
    const rt = createFakeRealtime()
    let opens = 0
    const open: OpenChannel = (name, selfId) => {
      opens++
      return rt.open(name, selfId)
    }
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: room.id, name: room.name, creatorId: 'a', ownerHash: await hash('token-a') })
    const props = () => ({
      room: { ...room },
      self: { ...alice },
      ownerToken: 'token-a',
      open,
      directory: dir,
      storage,
      feedback: { play: () => {} },
      onLeave: () => {},
    })
    const view = render(<RoomScreen {...props()} />)
    await flush()
    const calls = opens
    expect(calls).toBe(2)
    view.rerender(<RoomScreen {...props()} />)
    await flush()
    expect(opens).toBe(calls)
  })
})
