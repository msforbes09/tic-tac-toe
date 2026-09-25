import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SPLASH_FADE_MS, SPLASH_HOLD_MS, Splash } from './Splash'

describe('Splash', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the app name while it plays, then reports done after the hold and fade', () => {
    const onDone = vi.fn()
    render(<Splash onDone={onDone} />)
    expect(screen.getByRole('status', { name: /tic-tac-toe/i })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(SPLASH_HOLD_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('status')).toHaveClass('splash-leave')
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(SPLASH_FADE_MS))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('plays the splash cue once when it mounts', () => {
    const play = vi.fn()
    const view = render(<Splash onDone={() => {}} feedback={{ play }} />)
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith({ kind: 'splash' })
    view.rerender(<Splash onDone={() => {}} feedback={{ play }} />)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('stops its timers when unmounted early', () => {
    const onDone = vi.fn()
    const view = render(<Splash onDone={onDone} />)
    view.unmount()
    act(() => vi.advanceTimersByTime(SPLASH_HOLD_MS + SPLASH_FADE_MS + 10))
    expect(onDone).not.toHaveBeenCalled()
  })

  it('keeps the phone column on wide screens and draws the logo on the bare background, O first then X', () => {
    render(<Splash onDone={() => {}} />)
    const splash = screen.getByRole('status')
    expect(splash.querySelector('.max-w-\\[420px\\]')).not.toBeNull()
    expect(splash.querySelector('.splash-tile')).toBeNull()
    expect(screen.getByText('Tic-Tac-Toe')).toHaveClass('font-heading')
    expect(screen.getByText('Win three.')).toBeInTheDocument()
    const marks = Array.from(splash.querySelectorAll('.logo-mark')) as HTMLElement[]
    expect(marks.map((m) => m.dataset.player)).toEqual(['O', 'X'])
    const delay = (m: HTMLElement) => parseInt(m.style.getPropertyValue('--logo-delay'))
    expect(delay(marks[0])).toBeLessThan(delay(marks[1]))
  })
})

describe('Splash footer', () => {
  it('shows the version from package.json and the iam4bs copyright, without the rise-in animation', () => {
    render(<Splash onDone={() => {}} />)
    const footer = screen.getByRole('status').querySelector('[data-testid="splash-footer"]')
    expect(footer).toHaveTextContent(/^v\d+\.\d+\.\d+ · © \d{4} iam4bs$/)
    expect(footer).not.toHaveClass('splash-rise')
  })
})

describe('Splash backdrop', () => {
  it('shares the room backdrop and card with the app shell so nothing jumps when it leaves', () => {
    render(<Splash onDone={() => {}} />)
    const splash = screen.getByRole('status')
    expect(splash.querySelector('[data-testid="backdrop"]')).not.toBeNull()
    expect(splash.querySelector('.max-w-\\[420px\\]')).toHaveClass('room-card')
    // The splash is the brand and already carries the footer, so the room's corners stay empty.
    expect(splash.querySelector('.room-brand')).toBeNull()
    expect(splash.querySelector('.room-colophon')).toBeNull()
  })
})
