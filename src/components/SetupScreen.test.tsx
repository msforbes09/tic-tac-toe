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
  it('shows Online disabled with a hint when not set up', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} />)
    const item = screen.getByRole('button', { name: /online/i })
    expect(item).toBeDisabled()
    expect(screen.getByText('Not set up')).toBeInTheDocument()
  })

  it('replaces difficulty, symbol and Start with the online panel', () => {
    render(
      <SetupScreen
        onStart={() => {}}
        onOpenHistory={() => {}}
        online={{ available: true, panel: <div data-testid="panel">rooms here</div> }}
      />,
    )
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    expect(screen.getByTestId('panel')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hard/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /your symbol/i })).not.toBeInTheDocument()
  })

  it('tells the app when the mode changes', () => {
    const onModeChange = vi.fn()
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={{ available: true, panel: null }} onModeChange={onModeChange} />)
    fireEvent.click(screen.getByRole('button', { name: /online/i }))
    expect(onModeChange).toHaveBeenLastCalledWith('online')
    fireEvent.click(screen.getByRole('button', { name: /two player/i }))
    expect(onModeChange).toHaveBeenLastCalledWith('pvp')
  })

  it('keeps the offline Start button for the other modes', () => {
    render(<SetupScreen onStart={() => {}} onOpenHistory={() => {}} online={{ available: true, panel: null }} />)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
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
    expect(screen.getByText("Win three.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /bot/i }))
    expect(screen.getByText('Blocks and pounces')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^easy$/i }))
    expect(screen.getByText('Makes mistakes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^hard$/i }))
    expect(screen.getByText('Unbeatable')).toBeInTheDocument()
  })
})
