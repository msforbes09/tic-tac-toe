import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SPLASH_FADE_MS, SPLASH_HOLD_MS } from '@/components/Splash'
import type { InstallPlatform } from '@/platform/install'

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
    expect(screen.getByText(/no games yet/i)).toBeInTheDocument()
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
