import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SPLASH_FADE_MS, SPLASH_HOLD_MS } from '@/components/Splash'
import type { InstallPlatform } from '@/platform/install'
import { createFakeRealtime } from '@/lib/realtime'
import { createFakeDirectory } from '@/lib/roomDirectory'
import { NICKNAME_KEY, OWNED_KEY } from '@/lib/identity'
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
    expect(screen.getByText(/no bot games yet/i)).toBeInTheDocument()
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
  // The History sheet needs real timers to mount; fake timers come in only for the final pause.

  it('opens after the secret knock, and then shows the rung on the bot chip', async () => {
    render(<App />)
    tap(/two player/i)
    tap(/versus bot/i)
    tap(/two player/i)
    tap(/^history$/i)
    tap(/back$/i)
    tap(/start game/i)
    for (const n of [1, 5, 9, 3]) tap(`Cell ${n}, empty`)
    // The last knock is a tap on the occupied centre: it falls through the disabled cell to its wrapper.
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Cell 5, O' }).parentElement!)
    expect(screen.getByRole('button', { name: 'Cell 5, X' })).toBeInTheDocument()
    expect(screen.getByText('Game voided')).toBeInTheDocument()
    expect(screen.queryByText('Developer mode')).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(KNOCK_DELAY_MS)
    })
    expect(screen.getByText('Developer mode')).toBeInTheDocument()
    vi.useRealTimers()
    tap(/^enter$/i)
    fireEvent.click(await screen.findByRole('button', { name: /back$/i }))
    tap(/versus bot/i)
    expect(screen.getByText('Difficulty · – → 11')).toBeInTheDocument()
    tap(/start game/i)
    expect(screen.getByText('Bot · Medium · 11')).toBeInTheDocument()

    // The chip opens the developer panel: set the rung, which applies from the next game.
    tap('Bot · Medium · 11')
    fireEvent.change(screen.getByRole('spinbutton', { name: /rung/i }), { target: { value: '29' } })
    tap(/^set$/i)
    fireEvent.click(await screen.findByRole('button', { name: /back$/i }))
    tap(/versus bot/i)
    expect(screen.getByText('Difficulty · 29 → 22')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('tic-tac-toe:ladder')!)).toMatchObject({ rung: 29, streak: 0 })
  })

  it('the developer panel can reset game data and exit developer mode', () => {
    window.localStorage.setItem('tic-tac-toe:dev', '1')
    window.localStorage.setItem('tic-tac-toe:ladder', JSON.stringify({ rung: 17, streak: 0, topHeldAt: null, topHeldCount: 0 }))
    window.localStorage.setItem('tic-tac-toe:setup', JSON.stringify({ mode: 'bot', difficulty: 'medium', p1Symbol: 'X' }))
    render(<App />)
    tap(/start game/i)
    tap('Bot · Medium · 17')
    tap(/reset game data/i)
    tap(/tap again to confirm/i)
    expect(window.localStorage.getItem('tic-tac-toe:ladder')).toBeNull()
    expect(window.localStorage.getItem('tic-tac-toe:setup')).toBeNull()
    expect(window.localStorage.getItem('tic-tac-toe:history')).toBeNull()
    tap(/^exit$/i)
    expect(window.localStorage.getItem('tic-tac-toe:dev')).toBeNull()
    expect(screen.queryByRole('button', { name: /Bot ·/ })).toBeNull()
  })

  it('stays off when the knock is wrong', async () => {
    render(<App />)
    tap(/two player/i)
    tap(/two player/i)
    tap(/versus bot/i)
    tap(/two player/i)
    tap(/^history$/i)
    tap(/back$/i)
    tap(/start game/i)
    for (const n of [1, 5, 9, 3]) tap(`Cell ${n}, empty`)
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Cell 5, O' }).parentElement!)
    act(() => {
      vi.advanceTimersByTime(KNOCK_DELAY_MS)
    })
    // The double Two player at the start restarts the knock, so this still completes it.
    expect(screen.getByText('Developer mode')).toBeInTheDocument()
    vi.useRealTimers()
    tap(/cancel/i)
    fireEvent.click(await screen.findByRole('button', { name: /back$/i }))
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
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    await flush()
    expect(screen.getByText('You lost to Zed')).toBeInTheDocument()
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
