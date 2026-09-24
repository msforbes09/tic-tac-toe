import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOT_DELAY_MS, GameScreen } from './GameScreen'
import type { Feedback, FeedbackEvent } from '@/lib/feedback'
import type { Settings } from '@/lib/types'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import { createFakeRoom } from '@/lib/roomConnection'
import type { Snapshot } from '@/lib/room'

function fakeStorage() {
  const map = new Map<string, string>()
  const storage: HistoryStorage & { entries: () => HistoryEntry[] } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    entries: () => JSON.parse(map.get(STORAGE_KEY) ?? '[]'),
  }
  return storage
}

/** A Feedback player that just remembers what it was asked to play. */
function recorder() {
  const played: FeedbackEvent[] = []
  const feedback: Feedback & { played: FeedbackEvent[] } = {
    play: (event) => {
      played.push(event)
    },
    played,
  }
  return feedback
}

const pvp: Settings = { mode: 'pvp', difficulty: 'easy', p1Symbol: 'X' }
const hardBot: Settings = { mode: 'bot', difficulty: 'hard', p1Symbol: 'X' }
const easyBot = (p1Symbol: Settings['p1Symbol']): Settings => ({ mode: 'bot', difficulty: 'easy', p1Symbol })

/** The number shown next to a score label. */
const scoreOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent

const cell = (n: number) => screen.getByRole('button', { name: new RegExp(`^Cell ${n},`) })

describe('GameScreen feedback', () => {

  it('plays a move for each mark and a win for the winning mark', () => {
    const feedback = recorder()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(feedback.played).toEqual([
      { kind: 'move', player: 'X' },
      { kind: 'move', player: 'O' },
      { kind: 'move', player: 'X' },
      { kind: 'move', player: 'O' },
      { kind: 'win', player: 'X' },
    ])
  })

  it('plays nothing when starting a new game', () => {
    const feedback = recorder()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
    fireEvent.click(cell(1))
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(feedback.played).toHaveLength(1)
  })

  it('always plays sound: there is no mute control', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.queryByRole('button', { name: /mute/i })).not.toBeInTheDocument()
  })
})

describe('GameScreen two-player', () => {
  it('alternates X and O and names whose turn it is', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
    expect(screen.getByText("Player 2's turn")).toBeInTheDocument()
    fireEvent.click(cell(2))
    expect(cell(2)).toHaveAccessibleName('Cell 2, O')
  })

  it('announces the winner and records exactly one history entry', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={pvp} storage={storage} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.getByText('Player 1 wins!')).toBeInTheDocument()
    expect(cell(1)).toHaveAttribute('data-highlighted', 'true')
    const entries = storage.entries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ mode: 'pvp', difficulty: null, outcome: 'X', p1Symbol: 'X' })
    expect(typeof entries[0].timestamp).toBe('number')
  })

  it('records a draw', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={pvp} storage={storage} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 2, 3, 5, 4, 6, 8, 7, 9]) fireEvent.click(cell(n))
    expect(screen.getByText("It's a draw")).toBeInTheDocument()
    expect(storage.entries()[0]).toMatchObject({ outcome: 'draw' })
  })

  it('New game clears the board and keeps playing', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument()
    expect(cell(1)).toHaveAccessibleName('Cell 1, empty')
  })

  it('keeps a session score across games', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(scoreOf('Player 1')).toBe('0')
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(scoreOf('Player 1')).toBe('1')
    expect(scoreOf('Player 2')).toBe('0')
    expect(scoreOf('Draws')).toBe('0')
  })

  it('hands X to the other player after a draw', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 2, 3, 5, 4, 6, 8, 7, 9]) fireEvent.click(cell(n))
    expect(scoreOf('Draws')).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(screen.getByText("Player 2's turn")).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
  })

  it('never celebrates a two-player win', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
  })

  it('Back calls onBack', () => {
    const onBack = vi.fn()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('GameScreen versus bot', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets the bot reply after the delay and disables the board while thinking', () => {
    render(<GameScreen settings={hardBot} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    expect(cell(2)).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    const os = screen.getAllByRole('button', { name: /, O$/ })
    expect(os).toHaveLength(1)
    expect(screen.getByText('Your turn')).toBeInTheDocument()
  })

  it("plays feedback for the bot's move too", () => {
    const feedback = recorder()
    render(<GameScreen settings={hardBot} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
    fireEvent.click(cell(1))
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    expect(feedback.played).toEqual([
      { kind: 'move', player: 'X' },
      { kind: 'move', player: 'O' },
    ])
  })

  it('records a bot game with its difficulty', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} />)
    // Play until the game ends; hard bot forces a draw or win for O at worst.
    for (let turn = 0; turn < 5; turn++) {
      const empty = screen.queryAllByRole('button', { name: /, empty$/ }).filter((el) => !el.hasAttribute('disabled'))
      if (empty.length === 0) break
      fireEvent.click(empty[0])
      act(() => {
        vi.advanceTimersByTime(BOT_DELAY_MS)
      })
    }
    const entries = storage.entries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ mode: 'bot', difficulty: 'hard', p1Symbol: 'X' })
    expect(['O', 'draw']).toContain(entries[0].outcome)
  })

  it('lets the bot open as X when you pick O', () => {
    render(<GameScreen settings={{ ...hardBot, p1Symbol: 'O' }} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    expect(screen.getAllByRole('button', { name: /, X$/ })).toHaveLength(1)
    expect(screen.getByText('Your turn')).toBeInTheDocument()
  })

  describe('against an easy bot that always takes the first free cell', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    const botReplies = () =>
      act(() => {
        vi.advanceTimersByTime(BOT_DELAY_MS)
      })

    it('celebrates and scores when you beat the bot', () => {
      const feedback = recorder()
      render(<GameScreen settings={easyBot('X')} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
      // You take the middle row; the bot fills cells 1 and 2.
      for (const n of [4, 5, 6]) {
        fireEvent.click(cell(n))
        botReplies()
      }
      expect(screen.getByText('You win!')).toBeInTheDocument()
      expect(screen.getByTestId('celebration')).toBeInTheDocument()
      expect(scoreOf('You')).toBe('1')
      expect(feedback.played.at(-1)).toEqual({ kind: 'win', player: 'X' })
    })

    it('plays the lose sound and does not celebrate when the bot wins', () => {
      const feedback = recorder()
      render(<GameScreen settings={easyBot('O')} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
      // Bot (X) takes cells 1, 2, 3 across the top; you answer on the middle row.
      botReplies()
      fireEvent.click(cell(4))
      botReplies()
      fireEvent.click(cell(5))
      botReplies()
      expect(screen.getByText('Bot wins!')).toBeInTheDocument()
      expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
      expect(scoreOf('Bot')).toBe('1')
      expect(feedback.played.at(-1)).toEqual({ kind: 'lose' })
    })

    it('lets the bot open the next game after it wins', () => {
      render(<GameScreen settings={easyBot('X')} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
      // You play the right column; the bot takes cells 1, 2, 3 and wins.
      for (const n of [6, 9]) {
        fireEvent.click(cell(n))
        botReplies()
      }
      fireEvent.click(cell(5))
      botReplies()
      expect(screen.getByText('Bot wins!')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /new game/i }))
      expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    })
  })
})

const onlineSettings: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }

const buttonIn = (root: HTMLElement, text: RegExp) =>
  Array.from(root.querySelectorAll('button')).find((b) => text.test(b.textContent ?? ''))!

/** Two GameScreens in one fake room; queries are scoped to each side. */
function renderPair() {
  const storage = { host: fakeStorage(), guest: fakeStorage() }
  const room = createFakeRoom()
  const hostConn = room.join('host', 'h')
  const guestConn = room.join('guest', 'g')
  const onBack = { host: vi.fn(), guest: vi.fn() }
  const view = render(
    <>
      <div data-testid="host">
        <GameScreen
          settings={onlineSettings}
          storage={storage.host}
          feedback={recorder()}
          onBack={onBack.host}
          online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }}
        />
      </div>
      <div data-testid="guest">
        <GameScreen
          settings={onlineSettings}
          storage={storage.guest}
          feedback={recorder()}
          onBack={onBack.guest}
          online={{ role: 'guest', code: 'AB2C', connection: guestConn, friendPresent: true }}
        />
      </div>
    </>,
  )
  const within = (id: string) => screen.getByTestId(id)
  const cellIn = (id: string, n: number) =>
    Array.from(within(id).querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.startsWith(`Cell ${n},`))!
  return { view, room, hostConn, guestConn, onBack, within, cellIn, storage }
}

const playXWins = (cellIn: (id: string, n: number) => HTMLButtonElement) => {
  for (const [side, n] of [['host', 1], ['guest', 4], ['host', 2], ['guest', 5], ['host', 3]] as const) {
    fireEvent.click(cellIn(side, n))
  }
}

describe('GameScreen online', () => {
  it('labels the header and the seats from each side', () => {
    const { within } = renderPair()
    expect(within('host')).toHaveTextContent('Online · AB2C')
    expect(within('host')).toHaveTextContent('Your turn')
    expect(within('guest')).toHaveTextContent("Friend's turn")
  })

  it('host moves show on both boards; guest taps go through the host', () => {
    const { within, cellIn } = renderPair()
    expect(cellIn('guest', 1)).toBeDisabled()
    fireEvent.click(cellIn('host', 1))
    expect(cellIn('host', 1)).toHaveAccessibleName('Cell 1, X')
    expect(cellIn('guest', 1)).toHaveAccessibleName('Cell 1, X')
    expect(within('guest')).toHaveTextContent('Your turn')
    expect(cellIn('host', 2)).toBeDisabled()
    fireEvent.click(cellIn('guest', 5))
    expect(cellIn('host', 5)).toHaveAccessibleName('Cell 5, O')
    expect(cellIn('guest', 5)).toHaveAccessibleName('Cell 5, O')
  })

  it('a stale guest move request is dropped by the host', () => {
    const { guestConn, cellIn } = renderPair()
    act(() => guestConn.send({ type: 'move', index: 4 }))
    expect(cellIn('host', 4)).toHaveAccessibleName('Cell 4, empty')
  })

  it('either side can start a new game', () => {
    const { within, cellIn } = renderPair()
    fireEvent.click(cellIn('host', 1))
    fireEvent.click(buttonIn(within('guest'), /new game/i))
    expect(cellIn('host', 1)).toHaveAccessibleName('Cell 1, empty')
    expect(cellIn('guest', 1)).toHaveAccessibleName('Cell 1, empty')
  })

  it('records the finished game once on each device with its own symbol', () => {
    const { cellIn, storage } = renderPair()
    playXWins(cellIn)
    expect(storage.host.entries()).toEqual([
      expect.objectContaining({ mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' }),
    ])
    expect(storage.guest.entries()).toEqual([
      expect.objectContaining({ mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'O' }),
    ])
  })

  it('does not record twice when the host resends the finished snapshot', () => {
    const { cellIn, storage, hostConn } = renderPair()
    playXWins(cellIn)
    const finished: Snapshot = {
      board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
      p1Symbol: 'X',
      score: { p1: 1, p2: 0, draws: 0 },
      status: 'won',
      winner: 'X',
      winningLine: [0, 1, 2],
    }
    act(() => hostConn.send({ type: 'state', state: finished }))
    expect(storage.guest.entries()).toHaveLength(1)
  })

  it('the host sees Wait and Back when the guest leaves, and play resumes on return', () => {
    const room = createFakeRoom()
    const hostConn = room.join('host', 'h')
    const base = { settings: onlineSettings, storage: fakeStorage(), feedback: recorder(), onBack: vi.fn() }
    const online = (friendPresent: boolean) => ({ role: 'host' as const, code: 'AB2C', connection: hostConn, friendPresent })
    const view = render(<GameScreen {...base} online={online(true)} />)
    fireEvent.click(cell(1))
    view.rerender(<GameScreen {...base} online={online(false)} />)
    expect(screen.getByText('Your friend left')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^wait$/i }))
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    expect(cell(2)).toBeDisabled()
    view.rerender(<GameScreen {...base} online={online(true)} />)
    expect(screen.queryByText('Waiting for your friend…')).not.toBeInTheDocument()
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
  })

  it('the guest sees only Back when the host leaves', () => {
    const room = createFakeRoom()
    const guestConn = room.join('guest', 'g')
    const onBack = vi.fn()
    render(
      <GameScreen
        settings={onlineSettings}
        storage={fakeStorage()}
        feedback={recorder()}
        onBack={onBack}
        online={{ role: 'guest', code: 'AB2C', connection: guestConn, friendPresent: false }}
      />,
    )
    expect(screen.getByText('Your friend left')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^wait$/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('a guest whose screen mounts late asks for and gets the host state', () => {
    const room = createFakeRoom()
    const hostConn = room.join('host', 'h')
    const guestConn = room.join('guest', 'g')
    const base = { settings: onlineSettings, storage: fakeStorage(), feedback: recorder(), onBack: () => {} }
    const view = render(
      <div data-testid="host">
        <GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }} />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Cell 1,/ }))
    view.rerender(
      <>
        <div data-testid="host">
          <GameScreen {...base} online={{ role: 'host', code: 'AB2C', connection: hostConn, friendPresent: true }} />
        </div>
        <div data-testid="guest">
          <GameScreen {...base} online={{ role: 'guest', code: 'AB2C', connection: guestConn, friendPresent: true }} />
        </div>
      </>,
    )
    const guestCell1 = Array.from(screen.getByTestId('guest').querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label')?.startsWith('Cell 1,'),
    )!
    expect(guestCell1).toHaveAccessibleName('Cell 1, X')
  })

  it('the host sends its state to a friend who arrives', () => {
    const room = createFakeRoom()
    const hostConn = room.join('host', 'h')
    const base = { settings: onlineSettings, storage: fakeStorage(), feedback: recorder(), onBack: () => {} }
    const online = (friendPresent: boolean) => ({ role: 'host' as const, code: 'AB2C', connection: hostConn, friendPresent })
    const view = render(<GameScreen {...base} online={online(false)} />)
    const guestConn = room.join('guest', 'g')
    const seen: unknown[] = []
    guestConn.onMessage((m) => seen.push(m))
    view.rerender(<GameScreen {...base} online={online(true)} />)
    expect(seen).toEqual([expect.objectContaining({ type: 'state' })])
  })
})
