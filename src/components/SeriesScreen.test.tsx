import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SeriesScreen } from './SeriesScreen'
import type { Feedback, FeedbackEvent } from '@/lib/feedback'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import { createFakeRealtime, type FakeRealtime } from '@/lib/realtime'
import { gameChannel, type GamePresence, type SeriesResult } from '@/lib/room'
import { GRACE_MS, SERIES_GAMES, firstMoveP1Symbol, startSeries, type SeriesState } from '@/state/series'
import { createGameState } from '@/state/reducer'
import type { SeriesRole } from '@/state/online'

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const cat = { deviceId: 'c', nickname: 'Cat' }

function fakeStorage() {
  const map = new Map<string, string>()
  const storage: HistoryStorage & { entries: () => HistoryEntry[] } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    entries: () => JSON.parse(map.get(STORAGE_KEY) ?? '[]'),
  }
  return storage
}
function recorder() {
  const played: FeedbackEvent[] = []
  const feedback: Feedback & { played: FeedbackEvent[] } = { play: (e) => void played.push(e), played }
  return feedback
}

const flush = () => act(async () => {})

type Side = { el: () => HTMLElement; cell: (n: number) => HTMLButtonElement; button: (text: RegExp) => HTMLButtonElement; storage: ReturnType<typeof fakeStorage>; feedback: ReturnType<typeof recorder>; onExit: ReturnType<typeof vi.fn>; addResult: ReturnType<typeof vi.fn>; onResult: ReturnType<typeof vi.fn>; onAchievement: ReturnType<typeof vi.fn>; unmount: () => void }

function mount(rt: FakeRealtime, self: typeof alice, role: SeriesRole, initial: SeriesState): Side {
  const storage = fakeStorage()
  const feedback = recorder()
  const onExit = vi.fn()
  const addResult = vi.fn(async () => {})
  const onResult = vi.fn()
  const onAchievement = vi.fn()
  const view = render(
    <div data-testid={self.deviceId}>
      <SeriesScreen self={self} role={role} initial={initial} open={rt.open} storage={storage} feedback={feedback} onExit={onExit} onResult={onResult} addResult={addResult} onAchievement={onAchievement} />
    </div>,
  )
  const el = () => screen.getByTestId(self.deviceId)
  const buttons = () => Array.from(el().querySelectorAll('button'))
  return {
    el,
    cell: (n) => buttons().find((b) => b.getAttribute('aria-label')?.startsWith(`Cell ${n},`))!,
    button: (text) => buttons().find((b) => text.test(b.textContent ?? ''))!,
    storage,
    feedback,
    onExit,
    addResult,
    onResult,
    onAchievement,
    unmount: () => view.unmount(),
  }
}

/** Referee Alice, player Bob, watcher Cat, all connected. */
async function trio(initial = startSeries('r', 'g', alice, bob)) {
  const rt = createFakeRealtime()
  const a = mount(rt, alice, 'referee', initial)
  const b = mount(rt, bob, 'player', initial)
  const c = mount(rt, cat, 'watcher', initial)
  await flush()
  return { rt, a, b, c }
}

/** Game 1: Bob is X. X wins the top row. */
async function bobWinsGame1(a: Side, b: Side) {
  for (const [side, n] of [[b, 1], [a, 4], [b, 2], [a, 5], [b, 3]] as const) {
    fireEvent.click(side.cell(n))
    await flush()
  }
}

describe('SeriesScreen basics', () => {
  it('shows the series bar from each side, and names plus a Watching badge for the watcher', async () => {
    const { a, b, c } = await trio()
    expect(a.el()).toHaveTextContent('You 0 · 0 Bob')
    expect(a.el()).toHaveTextContent(`Game 1 of ${SERIES_GAMES}`)
    expect(b.el()).toHaveTextContent('Alice 0 · 0 You')
    expect(c.el()).toHaveTextContent('Alice 0 · 0 Bob')
    expect(c.el()).toHaveTextContent('Watching')
    expect(a.el()).not.toHaveTextContent('Watching')
    expect(a.el()).toHaveTextContent("Bob's turn")
    expect(b.el()).toHaveTextContent('Your move')
    expect(c.el()).toHaveTextContent("Bob's turn")
    // The mark of whoever is up sits beside the status, as in the other modes. Bob is X in game 1.
    for (const side of [a, b, c]) expect(side.el().querySelector('[data-status-mark]')).toHaveAttribute('data-status-mark', 'X')
  })

  it("Bob's tap goes through the referee and reaches everyone; only the player to move can tap", async () => {
    const { a, b, c } = await trio()
    expect(a.cell(1)).toBeDisabled()
    expect(c.cell(1)).toBeDisabled()
    fireEvent.click(b.cell(1))
    await flush()
    for (const side of [a, b, c]) expect(side.cell(1)).toHaveAccessibleName('Cell 1, X')
    expect(b.cell(2)).toBeDisabled()
    expect(a.cell(2)).not.toBeDisabled()
  })

  it('a finished game updates the score, enables Next game, and the next game swaps first move', async () => {
    const { a, b, c } = await trio()
    expect(a.button(/^next game$/i)).toBeDisabled()
    await bobWinsGame1(a, b)
    expect(a.el()).toHaveTextContent('You 0 · 1 Bob')
    expect(c.el()).toHaveTextContent('Bob wins!')
    expect(a.el()).toHaveTextContent('You lost')
    expect(b.el()).toHaveTextContent('You win!')
    expect(a.button(/^next game$/i)).not.toBeDisabled()
    fireEvent.click(b.button(/^next game$/i))
    await flush()
    for (const side of [a, b, c]) expect(side.el()).toHaveTextContent(`Game 2 of ${SERIES_GAMES}`)
    expect(a.el()).toHaveTextContent('Your move')
    expect(a.cell(5)).not.toBeDisabled()
  })

  it('saves nothing to local history: online series live in the database', async () => {
    const { a, b, c } = await trio()
    await bobWinsGame1(a, b)
    expect(a.storage.entries()).toEqual([])
    expect(b.storage.entries()).toEqual([])
    expect(c.storage.entries()).toEqual([])
    expect(b.feedback.played.filter((e) => e.kind === 'win')).toHaveLength(1)
    expect(a.feedback.played.filter((e) => e.kind === 'lose')).toHaveLength(1)
    expect(b.el().querySelector('[data-testid="celebration"]')).not.toBeNull()
    expect(a.el().querySelector('[data-testid="celebration"]')).toBeNull()
  })

  it('the watcher can go back to the room', async () => {
    const { c } = await trio()
    fireEvent.click(c.button(/back/i))
    expect(c.onExit).toHaveBeenCalledWith(null)
  })
})

describe('SeriesScreen resign and result', () => {
  it('Resign asks first, then ends the series for everyone with the result splash', async () => {
    const { a, b, c } = await trio()
    fireEvent.click(b.button(/^resign$/i))
    expect(screen.getByText('Resign the series?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /yes, resign/i }))
    await flush()
    expect(b.el()).toHaveTextContent('You lost the series')
    expect(a.el()).toHaveTextContent('You won the series')
    expect(c.el()).toHaveTextContent('Alice wins the series')
    expect(c.el()).toHaveTextContent('Bob resigned')
    expect(a.addResult).toHaveBeenCalledTimes(1)
    expect(a.onResult).toHaveBeenCalledTimes(1)
    expect(b.addResult).not.toHaveBeenCalled()
    const result: SeriesResult = a.addResult.mock.calls[0][0]
    expect(result.reason).toBe('resigned')
    fireEvent.click(a.button(/back to room/i))
    expect(a.onExit).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'g', reason: 'resigned' }))
    fireEvent.click(c.button(/back to room/i))
    expect(c.onExit).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'g' }))
  })

  it('shows the tie breaker splash when game 11 begins', async () => {
    const level: SeriesState = {
      ...startSeries('r', 'g', alice, bob),
      gameNumber: SERIES_GAMES,
      score: { challenger: 4, challenged: 4, draws: 1 },
      game: createGameState({ mode: 'online', difficulty: 'medium', p1Symbol: firstMoveP1Symbol(SERIES_GAMES) }),
    }
    const { a, b, c } = await trio(level)
    expect(a.el()).toHaveTextContent(`Game ${SERIES_GAMES} of ${SERIES_GAMES}`)
    // Game 10: Alice (challenger) is X. Draw: X 0,1,5,6,7 · O 2,3,4,8 (1-based cells below).
    for (const [side, n] of [[a, 1], [b, 3], [a, 2], [b, 4], [a, 6], [b, 5], [a, 7], [b, 9], [a, 8]] as const) {
      fireEvent.click(side.cell(n))
      await flush()
    }
    expect(a.el()).toHaveTextContent("It's a draw")
    fireEvent.click(a.button(/^next game$/i))
    await flush()
    for (const side of [a, b, c]) expect(side.el()).toHaveTextContent('Tie breaker')
  })
})

describe('SeriesScreen grace period', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('a dropped player is resigned after the grace period; the board waits meanwhile', async () => {
    const { rt, a, c } = await trio()
    rt.drop(gameChannel('g'), 'b')
    await flush()
    expect(a.el()).toHaveTextContent('Waiting for Bob…')
    expect(a.cell(1)).toBeDisabled()
    act(() => vi.advanceTimersByTime(GRACE_MS - 1))
    await flush()
    expect(a.addResult).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    await flush()
    expect(a.addResult).toHaveBeenCalledTimes(1)
    expect(a.addResult.mock.calls[0][0].reason).toBe('left')
    expect(a.el()).toHaveTextContent('You won the series')
    expect(c.el()).toHaveTextContent('Bob left')
  })

  it('a returning player within the grace period resumes', async () => {
    const { rt, a, b } = await trio()
    rt.drop(gameChannel('g'), 'b')
    b.unmount()
    await flush()
    act(() => vi.advanceTimersByTime(GRACE_MS / 2))
    const again = mount(rt, bob, 'player', startSeries('r', 'g', alice, bob))
    await flush()
    act(() => vi.advanceTimersByTime(GRACE_MS))
    await flush()
    expect(a.addResult).not.toHaveBeenCalled()
    expect(a.el()).not.toHaveTextContent('Waiting for Bob…')
    fireEvent.click(again.cell(1))
    await flush()
    expect(a.cell(1)).toHaveAccessibleName('Cell 1, X')
  })

  it('when the referee drops, the other player takes over and the watcher keeps receiving state', async () => {
    const { rt, b, c } = await trio()
    rt.drop(gameChannel('g'), 'a')
    await flush()
    expect(b.el()).toHaveTextContent('Waiting for Alice…')
    act(() => vi.advanceTimersByTime(GRACE_MS))
    await flush()
    const roles = rt.membersOf(gameChannel('g')).map((m) => (m.meta as GamePresence).role)
    expect(roles).toContain('referee')
    expect(rt.membersOf(gameChannel('g')).find((m) => m.id === 'b')?.meta).toEqual({ deviceId: 'b', role: 'referee' })
    // Alice never comes back: the new referee resigns her after another grace period.
    act(() => vi.advanceTimersByTime(GRACE_MS))
    await flush()
    expect(b.addResult).toHaveBeenCalledTimes(1)
    expect(b.addResult.mock.calls[0][0].loser).toEqual(alice)
    expect(c.el()).toHaveTextContent('Bob wins the series')
  })

  it('the referee re-sends its state whenever game presence changes, so a returning device resyncs', async () => {
    const { rt } = await trio()
    const late = await rt.open<GamePresence>(gameChannel('g'), 'late')
    const seen = vi.fn()
    late.onMessage(seen)
    late.track({ deviceId: 'late', role: 'watcher' })
    await flush()
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ type: 'state' }))
  })

  it('a player who never hears from a referee goes back to the room after the grace period, recording nothing', async () => {
    const rt = createFakeRealtime()
    const b = mount(rt, bob, 'player', startSeries('r', 'g', alice, bob))
    await flush()
    act(() => vi.advanceTimersByTime(GRACE_MS))
    await flush()
    expect(b.onExit).toHaveBeenCalledWith(null)
    expect(b.addResult).not.toHaveBeenCalled()
    expect(rt.membersOf(gameChannel('g')).find((m) => m.id === 'b')?.meta).toEqual({ deviceId: 'b', role: 'player' })
  })
})

describe('SeriesScreen achievements', () => {
  const at = (over: Partial<SeriesState>): SeriesState => {
    const base = startSeries('r', 'g', alice, bob)
    const gameNumber = over.gameNumber ?? base.gameNumber
    return { ...base, ...over, game: createGameState({ mode: 'online', difficulty: 'medium', p1Symbol: firstMoveP1Symbol(gameNumber) }) }
  }

  it('players report each finished game from their side; the watcher reports nothing', async () => {
    const { a, b, c } = await trio()
    await bobWinsGame1(a, b)
    expect(b.onAchievement).toHaveBeenCalledTimes(1)
    expect(b.onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'game', mode: 'online', result: 'win', symbol: 'X', opponentId: 'a', opponentBadge: null }))
    expect(a.onAchievement).toHaveBeenCalledTimes(1)
    expect(a.onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'game', mode: 'online', result: 'loss', symbol: 'O', opponentId: 'b' }))
    expect(c.onAchievement).not.toHaveBeenCalled()
  })

  it('reports the series when it is decided, with the score from each side and no tie break', async () => {
    // Game 6 at 5–0: Alice (challenger, X in even games) wins the top row and the series.
    const { a, b, c } = await trio(at({ gameNumber: 6, score: { challenger: 5, challenged: 0, draws: 0 } }))
    for (const [side, n] of [[a, 1], [b, 4], [a, 2], [b, 5], [a, 3]] as const) {
      fireEvent.click(side.cell(n))
      await flush()
    }
    expect(a.onAchievement).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'series', won: true, mine: 6, theirs: 0, trailedBy3: false, tieBreak: false, decided: true, roomId: 'r', opponentId: 'b', opponentBadge: null }))
    expect(b.onAchievement).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'series', won: false, mine: 0, theirs: 6 }))
    expect(a.onAchievement.mock.calls.map((c) => c[0].kind)).toEqual(['game', 'series'])
    expect(c.onAchievement).not.toHaveBeenCalled()
  })

  it('a resigned series is one series event and no game event, and remembers having trailed by 3', async () => {
    const { a, b } = await trio(at({ gameNumber: 4, score: { challenger: 0, challenged: 3, draws: 0 } }))
    fireEvent.click(b.button(/^resign$/i))
    fireEvent.click(screen.getByRole('button', { name: /yes, resign/i }))
    await flush()
    expect(a.onAchievement).toHaveBeenCalledTimes(1)
    expect(a.onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'series', won: true, mine: 0, theirs: 3, trailedBy3: true, decided: false }))
    expect(b.onAchievement).toHaveBeenCalledTimes(1)
    expect(b.onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'series', won: false, trailedBy3: false }))
  })

  it('a series decided in game 11 is a tie break', async () => {
    // Game 11: Bob (challenged) is X. Bob wins the top row.
    const { a, b } = await trio(at({ gameNumber: 11, score: { challenger: 5, challenged: 5, draws: 0 } }))
    for (const [side, n] of [[b, 1], [a, 4], [b, 2], [a, 5], [b, 3]] as const) {
      fireEvent.click(side.cell(n))
      await flush()
    }
    expect(b.onAchievement).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'series', won: true, tieBreak: true }))
  })

  it('shows each player’s badge above their name and passes the opponent’s badge along', async () => {
    const { a, b } = await trio(startSeries('r', 'g', { ...alice, badge: 'closer' }, { ...bob, badge: 'the-immovable' }))
    expect(within(a.el()).getByRole('img', { name: 'Closer' })).toBeInTheDocument()
    expect(within(a.el()).getByRole('img', { name: 'The Immovable' })).toBeInTheDocument()
    await bobWinsGame1(a, b)
    expect(a.onAchievement).toHaveBeenCalledWith(expect.objectContaining({ opponentBadge: 'the-immovable' }))
    expect(b.onAchievement).toHaveBeenCalledWith(expect.objectContaining({ opponentBadge: 'closer' }))
  })
})
