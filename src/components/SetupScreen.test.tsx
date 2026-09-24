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
