import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AchievementBadge, ICONS } from './AchievementBadge'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { AchievementToast, TOAST_MS } from './AchievementToast'

describe('AchievementToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the head of the queue, plays the chime once, and moves on after the delay or a tap', () => {
    const play = vi.fn()
    const onDone = vi.fn()
    const { rerender } = render(<AchievementToast queue={['hello-bot', 'closer']} onDone={onDone} feedback={{ play }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Hello, Bot')
    expect(screen.getByRole('status')).toHaveTextContent('Achievement unlocked')
    expect(screen.getByRole('status')).toHaveTextContent('Play your first bot game')
    expect(screen.getByRole('status')).toHaveAccessibleName('Achievement unlocked: Hello, Bot. Play your first bot game')
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith({ kind: 'achievement' })
    act(() => {
      vi.advanceTimersByTime(TOAST_MS)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
    rerender(<AchievementToast queue={['closer']} onDone={onDone} feedback={{ play }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Closer')
    expect(play).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('status'))
    expect(onDone).toHaveBeenCalledTimes(2)
    rerender(<AchievementToast queue={[]} onDone={onDone} feedback={{ play }} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('AchievementBadge', () => {
  it('draws a known achievement with its name and nothing for a missing or unknown id', () => {
    const { rerender } = render(<AchievementBadge id="the-immovable" />)
    expect(screen.getByRole('img', { name: 'The Immovable' })).toHaveAttribute('data-badge', 'the-immovable')
    rerender(<AchievementBadge id="future-thing" />)
    expect(screen.queryByRole('img')).toBeNull()
    rerender(<AchievementBadge id={null} />)
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('AchievementIcon map', () => {
  it('has a named import for every icon in the catalogue, so the bundle ships only those', () => {
    for (const a of ACHIEVEMENTS) expect(ICONS[a.icon], a.icon).toBeDefined()
  })
})
