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

  it('stops its timers when unmounted early', () => {
    const onDone = vi.fn()
    const view = render(<Splash onDone={onDone} />)
    view.unmount()
    act(() => vi.advanceTimersByTime(SPLASH_HOLD_MS + SPLASH_FADE_MS + 10))
    expect(onDone).not.toHaveBeenCalled()
  })
})
