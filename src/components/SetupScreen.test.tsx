import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('starts a two-player game by default', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} onOpenHistory={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ mode: 'pvp', difficulty: 'medium', p1Symbol: 'X' })
  })

  it('hides difficulty until bot mode is chosen', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    expect(screen.queryByRole('button', { name: /hard/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /bot/i }))
    expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument()
  })

  it('starts a bot game with the chosen difficulty', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} onOpenHistory={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /bot/i }))
    fireEvent.click(screen.getByRole('button', { name: /hard/i }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ mode: 'bot', difficulty: 'hard', p1Symbol: 'X' })
  })

  it('offers X or O only against the bot', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    expect(screen.queryByRole('group', { name: /your symbol/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /bot/i }))
    expect(screen.getByRole('group', { name: /your symbol/i })).toBeInTheDocument()
  })

  it('starts a bot game playing O', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} onOpenHistory={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /bot/i }))
    fireEvent.click(screen.getByRole('button', { name: /^play as o$/i }))
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ mode: 'bot', difficulty: 'medium', p1Symbol: 'O' })
  })

  it('always gives Player 1 X in a two-player game', () => {
    const onStart = vi.fn()
    render(<SetupScreen initial={{ mode: 'pvp', difficulty: 'easy', p1Symbol: 'O' }} onStart={onStart} onOpenHistory={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ mode: 'pvp', difficulty: 'easy', p1Symbol: 'X' })
  })

  it('preselects the setup it is given', () => {
    const onStart = vi.fn()
    render(<SetupScreen initial={{ mode: 'bot', difficulty: 'hard', p1Symbol: 'O' }} onStart={onStart} onOpenHistory={() => {}} />)
    expect(screen.getByRole('button', { name: /^hard$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^play as o$/i })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ mode: 'bot', difficulty: 'hard', p1Symbol: 'O' })
  })

  it('opens history', () => {
    const onOpenHistory = vi.fn()
    render(<SetupScreen onStart={() => {}} onOpenHistory={onOpenHistory} />)
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    expect(onOpenHistory).toHaveBeenCalledTimes(1)
  })
})

describe('SetupScreen online', () => {
  const online = (over: Partial<{ available: boolean; onCreate: () => void; onJoin: (c: string) => void }> = {}) => ({
    available: true,
    onCreate: vi.fn(),
    onJoin: vi.fn(),
    ...over,
  })

  it('shows Online disabled with a hint when not set up', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    const item = screen.getByRole('button', { name: /online/i })
    expect(item).toBeDisabled()
    expect(screen.getByText('Not set up')).toBeInTheDocument()
  })

  it('replaces difficulty, symbol and Start with Create room and Join', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={online()} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hard/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /your symbol/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /room code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^join$/i })).toBeDisabled()
  })

  it('creates a room', () => {
    const o = online()
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={o} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    expect(o.onCreate).toHaveBeenCalledTimes(1)
  })

  it('joins with a normalized code, by button or Enter', () => {
    const o = online()
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={o} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    const input = screen.getByRole('textbox', { name: /room code/i })
    fireEvent.change(input, { target: { value: 'ab2' } })
    expect(screen.getByRole('button', { name: /^join$/i })).toBeDisabled()
    fireEvent.change(input, { target: { value: ' ab2c ' } })
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }))
    expect(o.onJoin).toHaveBeenCalledWith('AB2C')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(o.onJoin).toHaveBeenCalledTimes(2)
  })

  it('keeps the offline Start button for the other modes', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={online()} />)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create room/i })).not.toBeInTheDocument()
  })
})

describe('SetupScreen install card', () => {
  it('is absent by default', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument()
  })

  it('offers a one-tap Install and Not now when the browser can prompt', () => {
    const onInstall = vi.fn()
    const onDismiss = vi.fn()
    render(
      <SetupScreen onStart={() => {}} onOpenHistory={() => {}} install={{ kind: 'prompt', onInstall, onDismiss }} />,
    )
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    expect(onInstall).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('explains the Share steps on iPhone instead of an Install button', () => {
    render(
      <SetupScreen onStart={() => {}} onOpenHistory={() => {}} install={{ kind: 'ios-steps', onInstall: () => {}, onDismiss: () => {} }} />,
    )
    expect(screen.getByText(/share/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^install$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument()
  })

  it('carries the tagline and the bot descriptions', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    expect(screen.getByText("Three’s a win.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /bot/i }))
    expect(screen.getByText('Blocks and pounces')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^easy$/i }))
    expect(screen.getByText('Makes mistakes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^hard$/i }))
    expect(screen.getByText('Unbeatable')).toBeInTheDocument()
  })
})
