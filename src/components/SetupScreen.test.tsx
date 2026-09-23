import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  it('starts a two-player game by default', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} onOpenHistory={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledWith({ mode: 'pvp', difficulty: 'medium' })
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
    expect(onStart).toHaveBeenCalledWith({ mode: 'bot', difficulty: 'hard' })
  })

  it('opens history', () => {
    const onOpenHistory = vi.fn()
    render(<SetupScreen onStart={() => {}} onOpenHistory={onOpenHistory} />)
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    expect(onOpenHistory).toHaveBeenCalledTimes(1)
  })
})
