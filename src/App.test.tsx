import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SPLASH_FADE_MS, SPLASH_HOLD_MS } from '@/components/Splash'
import type { InstallPlatform } from '@/platform/install'
import { createFakeRealtime } from '@/lib/realtime'
import { createFakeDirectory } from '@/lib/roomDirectory'
import { DEVICE_KEY, NICKNAME_KEY, OWNED_KEY, PLAYER_TOKEN_KEY } from '@/lib/identity'
import { STORAGE_KEY } from '@/lib/history'
import { LADDER_KEY } from '@/lib/ladder'
import { ACHIEVEMENTS_KEY, EMPTY_STATE, loadAchievements, saveAchievements } from '@/lib/achievements'
import { REGISTERED_KEY } from '@/lib/reset'
import { KNOCK_DELAY_MS } from '@/lib/knock'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the game title on the setup screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  })

  it('starts a game and returns to setup', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  })

  it('remembers the last setup on the next visit', () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /versus bot/i }))
    fireEvent.click(screen.getByRole('button', { name: /^hard$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^play as o$/i }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    first.unmount()

    render(<App />)
    expect(screen.getByRole('button', { name: /versus bot/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^hard$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^play as o$/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens the history sheet', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    expect(screen.getByText(/no two-player games yet/i)).toBeInTheDocument()
  })
})

describe('App settings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  const flush = () => act(async () => {})
  const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

  it('turns the aggressive bot on from Settings, changes the hints, and remembers it', () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /versus bot/i }))
    expect(screen.getByText('I block. Can you?')).toBeInTheDocument()
    openSettings()
    fireEvent.click(screen.getByRole('switch', { name: 'Aggressive bot' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Blocks. Bites back.')).toBeInTheDocument()
    first.unmount()

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /versus bot/i }))
    expect(screen.getByText('Blocks. Bites back.')).toBeInTheDocument()
  })

  it('renames the player from Settings, locally and in the directory when online is set up', async () => {
    const hash = async (t: string) => `h:${t}`
    const dir = createFakeDirectory(hash)
    const deps = { open: createFakeRealtime().open, directory: dir, hash, share: async () => 'copied' as const, newId: () => 'R' }
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    await flush()
    openSettings()
    const field = screen.getByRole('textbox', { name: 'Nickname' })
    expect(field).toHaveValue('Alice')
    fireEvent.change(field, { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await flush()
    expect(window.localStorage.getItem(NICKNAME_KEY)).toBe('Bob')
    expect(dir.players()).toEqual([{ id: expect.any(String), nickname: 'Bob' }])
  })

  it('has no Settings gear during a game', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()
  })
})

describe('App developer mode', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const tap = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }))

  /** The whole knock, from setup. Ends with the developer dialog open (or not) after the pause. */
  /** Every tap of the knock, ending on the occupied centre, with fake timers left running for the wait. */
  const knockTaps = () => {
    tap(/two player/i)
    tap(/versus bot/i)
    tap(/two player/i)
    tap(/^history$/i)
    tap(/^back$/i)
    tap(/start game/i)
    for (const n of [1, 5, 9, 3]) tap(`Cell ${n}, empty`)
    // The last knock is a tap on the occupied centre: it falls through the disabled cell to its wrapper.
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Cell 5, O' }).parentElement!)
  }
  const doKnock = () => {
    knockTaps()
    act(() => {
      vi.advanceTimersByTime(KNOCK_DELAY_MS)
    })
    vi.useRealTimers()
  }

  it('cancels the developer prompt when the wait is interrupted by a tap, and lands on setup', () => {
    render(<App />)
    knockTaps()
    // Tapping any cell during the wait (they are disabled, so it reaches the wrapper) calls it off.
    fireEvent.click(screen.getByRole('button', { name: 'Cell 1, X' }).parentElement!)
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(KNOCK_DELAY_MS)
    })
    vi.useRealTimers()
    expect(screen.queryByText('Developer mode')).not.toBeInTheDocument()
  })

  it('cancels the developer prompt when Back is tapped during the wait', () => {
    render(<App />)
    knockTaps()
    tap(/^← back$/i)
    act(() => {
      vi.advanceTimersByTime(KNOCK_DELAY_MS)
    })
    vi.useRealTimers()
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    expect(screen.queryByText('Developer mode')).not.toBeInTheDocument()
  })

  it('offers no developer section in Settings outside developer mode', () => {
    render(<App />)
    tap('Settings')
    expect(screen.queryByText('Developer')).not.toBeInTheDocument()
  })
  /** Enter developer mode; every dialog action lands on setup. */
  const enter = async () => {
    tap(/^enter$/i)
    expect(await screen.findByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  }

  it('opens after the secret knock, voiding that game, and then shows the rung on the bot chip', async () => {
    render(<App />)
    doKnock()
    // The dialog is modal, so the voided board behind it is hidden from the accessibility tree.
    expect(screen.getByRole('button', { name: 'Cell 5, X', hidden: true })).toBeInTheDocument()
    expect(screen.getByText('Game voided')).toBeInTheDocument()
    expect(screen.getByText('Developer mode')).toBeInTheDocument()
    await enter()

    tap(/versus bot/i)
    expect(screen.getByText('Difficulty · – → 11')).toBeInTheDocument()
    tap(/start game/i)
    expect(screen.getByText('Bot · Medium · 11')).toBeInTheDocument()

    // The chip is plain text; the developer tools live in Settings, off the setup screen.
    expect(screen.queryByRole('button', { name: /Bot ·/ })).toBeNull()
    tap(/^← back$/i)
    tap('Settings')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Developer')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: /rung/i }), { target: { value: '29' } })
    tap(/^set$/i)
    expect(await screen.findByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    tap(/versus bot/i)
    expect(screen.getByText('Difficulty · 29 → 22')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('tic-tac-toe:ladder')!)).toMatchObject({ rung: 29, streak: 0 })
  })

  it('the developer panel can reset game data, locally and in the cloud, and exit developer mode', async () => {
    window.localStorage.setItem('tic-tac-toe:ladder', JSON.stringify({ rung: 17, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 1 }))
    window.localStorage.setItem(DEVICE_KEY, 'device-0001')
    window.localStorage.setItem(PLAYER_TOKEN_KEY, 'token-0000000001')
    const hash = async (t: string) => `h:${t}`
    const dir = createFakeDirectory(hash)
    await dir.addGames([{ id: 'g1', playerId: 'device-0001', mode: 'bot', difficulty: 'medium', rung: 17, outcome: 'won', symbol: 'X', playedAt: 1 }])
    await dir.saveLadder('device-0001', 'token-0000000001', { rung: 17, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 1 })
    render(<App deps={{ open: createFakeRealtime().open, directory: dir, hash }} />)
    await act(async () => {})
    doKnock()
    await enter()
    tap('Settings')
    tap(/reset game data/i)
    tap(/tap again to confirm/i)
    await act(async () => {})
    expect(window.localStorage.getItem('tic-tac-toe:ladder')).toBeNull()
    expect(window.localStorage.getItem('tic-tac-toe:setup')).toBeNull()
    expect(window.localStorage.getItem('tic-tac-toe:history')).toBeNull()
    expect(await dir.listGames('device-0001', 'bot')).toEqual([])
    expect(await dir.loadLadder('device-0001')).toBeNull()
    // The reset landed on setup. The ladder is gone, so Medium starts at 11 again.
    expect(await screen.findByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    tap('Settings')
    tap(/^exit developer mode$/i)
    expect(await screen.findByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    tap(/versus bot/i)
    tap(/start game/i)
    expect(screen.getByText('Bot · Medium')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bot ·/ })).toBeNull()
  })

  it('ignores the knock while developer mode is already on', async () => {
    render(<App />)
    doKnock()
    await enter()
    doKnock()
    expect(screen.queryByText('Developer mode')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cell 5, O' })).toBeInTheDocument()
    expect(screen.queryByText('Game voided')).not.toBeInTheDocument()
  })

  it('does not remember developer mode across loads', async () => {
    const first = render(<App />)
    doKnock()
    await enter()
    first.unmount()
    render(<App />)
    tap(/versus bot/i)
    expect(screen.queryByText(/Difficulty · /)).not.toBeInTheDocument()
    tap(/start game/i)
    expect(screen.getByText('Bot · Medium')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bot ·/ })).toBeNull()
  })

  it('stays off when the knock is wrong', async () => {
    render(<App />)
    tap(/two player/i)
    doKnock()
    // The double Two player at the start restarts the knock, so this still completes it.
    expect(screen.getByText('Developer mode')).toBeInTheDocument()
    tap(/cancel/i)
    expect(await screen.findByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
    tap(/versus bot/i)
    tap(/start game/i)
    expect(screen.getByText('Bot · Medium')).toBeInTheDocument()
    expect(screen.queryByText(/Bot · Medium · \d+/)).not.toBeInTheDocument()
  })
})

describe('App splash', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('opens with the splash on every load and removes it after it plays', () => {
    render(<App />)
    expect(screen.getByRole('status', { name: /tic-tac-toe/i })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(SPLASH_HOLD_MS + SPLASH_FADE_MS))
    expect(screen.queryByRole('status', { name: /tic-tac-toe/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  })
})

describe('App install nudge', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  const platform = (over: Partial<InstallPlatform> = {}) => {
    const prompt = vi.fn<InstallPlatform['prompt']>().mockResolvedValue('accepted')
    const p: InstallPlatform = {
      standalone: false,
      ios: false,
      onPromptAvailable: (cb) => {
        cb(true)
        return () => {}
      },
      prompt,
      ...over,
    }
    return { ...p, prompt }
  }

  it('shows Install when the browser can prompt, and installs on tap', async () => {
    const p = platform()
    render(<App deps={{ install: p }} />)
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    await act(async () => {})
    expect(p.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
  })

  it('shows the iPhone steps and remembers Not now across visits', () => {
    const p = platform({ ios: true, onPromptAvailable: () => () => {} })
    const first = render(<App deps={{ install: p }} />)
    expect(screen.getByText(/share/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
    first.unmount()
    render(<App deps={{ install: p }} />)
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
  })

  it('shows nothing when already installed', () => {
    render(<App deps={{ install: platform({ standalone: true }) }} />)
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
  })

  it('still offers Install in Settings after Not now, and not once installed', async () => {
    const p = platform()
    render(<App deps={{ install: p }} />)
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    await act(async () => {})
    expect(p.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
  })

  it('has no install section in Settings when already installed', () => {
    render(<App deps={{ install: platform({ standalone: true }) }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
  })
})

describe('App online rooms', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  const flush = () => act(async () => {})
  const hash = async (t: string) => `h:${t}`

  function online(extra: { url?: string; replaceUrl?: (u: string) => void } = {}) {
    const rt = createFakeRealtime()
    const dir = createFakeDirectory(hash)
    let n = 0
    const deps = { open: rt.open, directory: dir, hash, share: async () => 'copied' as const, newId: () => `ROOM${++n}`, ...extra }
    return { rt, dir, deps }
  }
  const pickOnline = () => fireEvent.click(screen.getByRole('button', { name: /^online$/i }))
  const saveNickname = () => fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  it('disables Online when Supabase is not configured (tests never see the real env)', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /^online$/i })).toBeDisabled()
  })

  it('disables Online as Offline while the phone has no connection, and re-enables it when it returns', () => {
    const { deps } = online()
    const setOnLine = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true })
    setOnLine(false)
    try {
      render(<App deps={deps} />)
      expect(screen.getByRole('button', { name: /^online$/i })).toBeDisabled()
      expect(screen.getByText('Offline')).toBeInTheDocument()
      setOnLine(true)
      act(() => {
        window.dispatchEvent(new Event('online'))
      })
      expect(screen.getByRole('button', { name: /^online$/i })).toBeEnabled()
      expect(screen.queryByText('Offline')).not.toBeInTheDocument()
      setOnLine(false)
      act(() => {
        window.dispatchEvent(new Event('offline'))
      })
      expect(screen.getByRole('button', { name: /^online$/i })).toBeDisabled()
    } finally {
      setOnLine(true)
    }
  })

  it('asks for a nickname the first time Online is picked and remembers it', async () => {
    const { deps } = online()
    const first = render(<App deps={deps} />)
    pickOnline()
    expect(screen.getByRole('textbox', { name: /nickname/i })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /nickname/i }), { target: { value: 'Alice' } })
    saveNickname()
    await flush()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(window.localStorage.getItem(NICKNAME_KEY)).toBe('Alice')
    first.unmount()
    render(<App deps={deps} />)
    pickOnline()
    expect(screen.queryByRole('textbox', { name: /nickname/i })).not.toBeInTheDocument()
  })

  it('saves the player to the directory when the nickname is saved and again on later visits', async () => {
    const { deps, dir } = online()
    const first = render(<App deps={deps} />)
    pickOnline()
    fireEvent.change(screen.getByRole('textbox', { name: /nickname/i }), { target: { value: 'Alice' } })
    saveNickname()
    await flush()
    expect(dir.players()).toEqual([{ id: expect.any(String), nickname: 'Alice' }])
    first.unmount()
    render(<App deps={deps} />)
    await flush()
    expect(dir.players()).toHaveLength(1)
  })

  it('shows my online series in History', async () => {
    const { deps, dir } = online()
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    await flush()
    const me = dir.players()[0]?.id ?? JSON.parse('null')
    await dir.createRoom({ id: 'ABCD23', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    await act(async () => {
      await dir.addResult({
        gameId: 'G1', roomId: 'ABCD23', challengerId: 'z', challengedId: me,
        winner: { deviceId: 'z', nickname: 'Zed' }, loser: { deviceId: me, nickname: 'Alice' },
        winnerScore: 6, loserScore: 2, games: 8, reason: 'decided', endedAt: 5,
      })
    })
    pickOnline()
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    await flush()
    expect(screen.getByText('You lost to Zed')).toBeInTheDocument()
  })

  it('History follows the selected mode', async () => {
    const { deps } = online()
    render(<App deps={deps} />)
    fireEvent.click(screen.getByRole('button', { name: /versus bot/i }))
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    await flush()
    expect(screen.getByRole('heading', { name: 'Bot history' })).toBeInTheDocument()
  })

  it('pushes unsynced local games to the cloud on launch and marks them', async () => {
    const { deps, dir } = online()
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'old1', timestamp: 1, mode: 'bot', difficulty: 'easy', outcome: 'X', p1Symbol: 'X', rung: 2 },
        { id: 'old2', timestamp: 2, mode: 'pvp', difficulty: null, outcome: 'draw', p1Symbol: 'X', synced: true },
        { id: 'legacy', timestamp: 3, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' },
      ]),
    )
    render(<App deps={deps} />)
    await flush()
    await flush()
    const me = window.localStorage.getItem('tic-tac-toe:device') ?? ''
    expect((await dir.listGames(me, 'bot')).map((g) => g.id)).toEqual(['old1'])
    expect(await dir.listGames(me, 'pvp')).toEqual([])
    expect(await dir.listGames(me, 'online')).toEqual([])
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as { id: string; synced?: boolean }[]
    expect(stored.find((e) => e.id === 'old1')?.synced).toBe(true)
    expect(stored.find((e) => e.id === 'legacy')?.synced).toBe(true)
  })

  it('pushes a game to the cloud as soon as it is recorded', async () => {
    const { deps, dir } = online()
    render(<App deps={deps} />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Cell ${n},`) }))
    await flush()
    const me = window.localStorage.getItem('tic-tac-toe:device') ?? ''
    const rows = await dir.listGames(me, 'pvp')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ mode: 'pvp', outcome: 'won', symbol: 'X' })
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as { synced?: boolean }[]
    expect(stored[0].synced).toBe(true)
  })

  it('adopts a newer cloud ladder on launch and ignores an older one', async () => {
    const { deps, dir } = online()
    window.localStorage.setItem(LADDER_KEY, JSON.stringify({ rung: 7, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 100 }))
    const first = render(<App deps={deps} />)
    await flush()
    const me = window.localStorage.getItem('tic-tac-toe:device') ?? ''
    const token = window.localStorage.getItem('tic-tac-toe:player-token') ?? ''
    first.unmount()
    await dir.saveLadder(me, token, { rung: 12, streak: 2, topHeldAt: null, topHeldCount: 0, updatedAt: 200 })
    render(<App deps={deps} />)
    await flush()
    await flush()
    expect(JSON.parse(window.localStorage.getItem(LADDER_KEY) ?? '{}').rung).toBe(12)
  })

  it('does not adopt an older cloud ladder', async () => {
    const { deps, dir } = online()
    const seed = render(<App deps={deps} />)
    await flush()
    const me = window.localStorage.getItem('tic-tac-toe:device') ?? ''
    const token = window.localStorage.getItem('tic-tac-toe:player-token') ?? ''
    seed.unmount()
    await dir.saveLadder(me, token, { rung: 3, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 50 })
    window.localStorage.setItem(LADDER_KEY, JSON.stringify({ rung: 20, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 500 }))
    render(<App deps={deps} />)
    await flush()
    await flush()
    expect(JSON.parse(window.localStorage.getItem(LADDER_KEY) ?? '{}').rung).toBe(20)
  })

  it('creates a room, enters it as owner, and remembers the owner token', async () => {
    const { deps, dir } = online()
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    pickOnline()
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    await flush()
    await flush()
    expect(dir.rooms()).toHaveLength(1)
    expect(screen.getByRole('heading', { name: dir.rooms()[0].name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete room/i })).toBeInTheDocument()
    expect(Object.keys(JSON.parse(window.localStorage.getItem(OWNED_KEY) ?? '{}'))).toEqual([dir.rooms()[0].id])
  })

  it('a second Create asks to delete the existing room first, then the list shows Online again', async () => {
    const { deps, dir } = online()
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    pickOnline()
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    await flush()
    await flush()
    const firstId = dir.rooms()[0].id
    fireEvent.click(screen.getByRole('button', { name: /leave/i }))
    await flush()
    expect(screen.getByRole('button', { name: /^online$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Your room')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    expect(screen.getByText(/delete your room .* and create a new one\?/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete and create/i }))
    await flush()
    await flush()
    expect(dir.rooms()).toHaveLength(1)
    expect(dir.rooms()[0].id).not.toBe(firstId)
  })

  it("enters someone else's room from the list, without a Delete button", async () => {
    const { deps, dir } = online()
    await dir.createRoom({ id: 'ABCD23', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    pickOnline()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: /quiet edge/i }))
    await flush()
    expect(screen.getByRole('heading', { name: 'Quiet Edge' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete room/i })).not.toBeInTheDocument()
  })

  it('a ?room= link opens straight into that room and cleans the address bar', async () => {
    const replaceUrl = vi.fn()
    const { deps, dir } = online({ url: 'https://x.test/app/?room=abcd23', replaceUrl })
    await dir.createRoom({ id: 'ABCD23', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    await flush()
    await flush()
    expect(screen.getByRole('heading', { name: 'Quiet Edge' })).toBeInTheDocument()
    expect(replaceUrl).toHaveBeenCalledWith('https://x.test/app/')
  })

  it('a link to a room that no longer exists lands on the list with a note', async () => {
    const { deps } = online({ url: 'https://x.test/app/?room=zzzz', replaceUrl: () => {} })
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    await flush()
    expect(screen.getByText('That room is gone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^online$/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a notice on the list when the room you are in is deleted', async () => {
    const { deps, dir } = online()
    await dir.createRoom({ id: 'ABCD23', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    pickOnline()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: /quiet edge/i }))
    await flush()
    await act(async () => {
      await dir.deleteRoom('ABCD23', 't')
    })
    expect(screen.getByText('The room was deleted')).toBeInTheDocument()
    expect(screen.getByText('No open rooms yet. Create one!')).toBeInTheDocument()
  })

  it('does not remember Online as the setup mode', async () => {
    const { deps } = online()
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    const first = render(<App deps={deps} />)
    pickOnline()
    first.unmount()
    render(<App deps={deps} />)
    expect(screen.getByRole('button', { name: /two player/i })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('App achievements', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  const flush = () => act(async () => {})
  const hash = async (t: string) => `h:${t}`
  const online = () => {
    const rt = createFakeRealtime()
    const dir = createFakeDirectory(hash)
    return { rt, dir, deps: { open: rt.open, directory: dir, hash } }
  }
  const me = () => window.localStorage.getItem(DEVICE_KEY) ?? ''
  const token = () => window.localStorage.getItem(PLAYER_TOKEN_KEY) ?? ''
  const playPvpWin = () => {
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Cell ${n},`) }))
  }

  it('unlocks Opening Move after the first two-player game, toasts it, saves locally, and pushes to the cloud', async () => {
    const { deps, dir } = online()
    render(<App deps={deps} />)
    await flush()
    playPvpWin()
    expect(await screen.findByRole('status', { name: /achievement unlocked/i })).toHaveTextContent('Opening Move')
    await flush()
    expect(loadAchievements(window.localStorage).unlocks['opening-move']).toBeDefined()
    const cloud = await dir.loadAchievements(me())
    expect(cloud?.unlocks['opening-move']).toBeDefined()
    expect(cloud?.progress.games.pvp).toBe(1)
  })

  it('toasts without a cloud, and still unlocks offline', async () => {
    render(<App />)
    playPvpWin()
    expect(await screen.findByRole('status', { name: /achievement unlocked/i })).toHaveTextContent('Opening Move')
    expect(loadAchievements(window.localStorage).unlocks['opening-move']).toBeDefined()
  })

  it('merges the cloud copy on launch and pushes when local has more', async () => {
    const { deps, dir } = online()
    const seed = render(<App deps={deps} />)
    await flush()
    const id = me()
    const tok = token()
    seed.unmount()
    await dir.saveAchievements(id, tok, { ...EMPTY_STATE, unlocks: { landlord: 5 }, updatedAt: 5 })
    saveAchievements(window.localStorage, { ...EMPTY_STATE, unlocks: { 'hello-bot': 9 }, updatedAt: 9 })
    render(<App deps={deps} />)
    await flush()
    await flush()
    expect(loadAchievements(window.localStorage).unlocks).toEqual({ landlord: 5, 'hello-bot': 9 })
    expect((await dir.loadAchievements(id))?.unlocks).toEqual({ landlord: 5, 'hello-bot': 9 })
  })

  it('opens the Achievements sheet from setup', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Achievements' }))
    expect(await screen.findByText('0 of 41 unlocked')).toBeInTheDocument()
  })

  it('wears a badge picked in Settings, saved locally and to the cloud', async () => {
    const { deps, dir } = online()
    saveAchievements(window.localStorage, { ...EMPTY_STATE, unlocks: { 'hello-bot': 1, closer: 2 }, updatedAt: 3 })
    render(<App deps={deps} />)
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(await screen.findByRole('radio', { name: 'Hello, Bot' }))
    await flush()
    expect(loadAchievements(window.localStorage).badge).toBe('hello-bot')
    expect((await dir.loadAchievements(me()))?.badge).toBe('hello-bot')
  })

  it('marks the device registered after the player row is saved', async () => {
    const { deps } = online()
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    await flush()
    expect(window.localStorage.getItem(REGISTERED_KEY)).toBe('1')
  })

  it('wipes local game data when the device had registered and its player row is gone, keeping its identity', async () => {
    const { deps } = online()
    window.localStorage.setItem(DEVICE_KEY, 'device-0002')
    window.localStorage.setItem(PLAYER_TOKEN_KEY, 'token-0000000002')
    window.localStorage.setItem(REGISTERED_KEY, '1')
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    window.localStorage.setItem(LADDER_KEY, JSON.stringify({ rung: 17, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 1 }))
    saveAchievements(window.localStorage, { ...EMPTY_STATE, unlocks: { 'hello-bot': 1 }, updatedAt: 3 })
    render(<App deps={deps} />)
    await flush()
    await flush()
    expect(window.localStorage.getItem(NICKNAME_KEY)).toBeNull()
    expect(window.localStorage.getItem(LADDER_KEY)).toBeNull()
    expect(window.localStorage.getItem(ACHIEVEMENTS_KEY)).toBeNull()
    expect(window.localStorage.getItem(REGISTERED_KEY)).toBeNull()
    expect(window.localStorage.getItem(DEVICE_KEY)).toBe('device-0002')
    expect(window.localStorage.getItem(PLAYER_TOKEN_KEY)).toBe('token-0000000002')
    fireEvent.click(screen.getByRole('button', { name: 'Achievements' }))
    expect(await screen.findByText('0 of 41 unlocked')).toBeInTheDocument()
  })

  it('does not wipe a device that never registered', async () => {
    const { deps } = online()
    window.localStorage.setItem(LADDER_KEY, JSON.stringify({ rung: 17, streak: 0, topHeldAt: null, topHeldCount: 0, updatedAt: 1 }))
    saveAchievements(window.localStorage, { ...EMPTY_STATE, unlocks: { 'hello-bot': 1 }, updatedAt: 3 })
    render(<App deps={deps} />)
    await flush()
    await flush()
    expect(JSON.parse(window.localStorage.getItem(LADDER_KEY) ?? '{}').rung).toBe(17)
    expect(loadAchievements(window.localStorage).unlocks['hello-bot']).toBe(1)
  })

  it('reports creating a room as Landlord', async () => {
    const { deps } = online()
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={deps} />)
    await flush()
    fireEvent.click(screen.getByRole('button', { name: /^online$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /create/i }))
    await flush()
    expect(loadAchievements(window.localStorage).unlocks.landlord).toBeDefined()
  })
})

describe('App full reset guards', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  const flush = () => act(async () => {})
  const hash = async (t: string) => `h:${t}`

  it('does not re-register a registered device while the player lookup fails, so a wipe cannot be escaped', async () => {
    const rt = createFakeRealtime()
    const dir = createFakeDirectory(hash)
    const savePlayer = vi.spyOn(dir, 'savePlayer')
    vi.spyOn(dir, 'loadPlayer').mockRejectedValue(new Error('offline-ish'))
    window.localStorage.setItem(REGISTERED_KEY, '1')
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={{ open: rt.open, directory: dir, hash }} />)
    await flush()
    await flush()
    expect(savePlayer).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(NICKNAME_KEY)).toBe('Alice')
  })

  it('still registers a device that never registered when the lookup fails', async () => {
    const rt = createFakeRealtime()
    const dir = createFakeDirectory(hash)
    const savePlayer = vi.spyOn(dir, 'savePlayer')
    vi.spyOn(dir, 'loadPlayer').mockRejectedValue(new Error('offline-ish'))
    window.localStorage.setItem(NICKNAME_KEY, 'Alice')
    render(<App deps={{ open: rt.open, directory: dir, hash }} />)
    await flush()
    await flush()
    expect(savePlayer).toHaveBeenCalled()
  })
})
