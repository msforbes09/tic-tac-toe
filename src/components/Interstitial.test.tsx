import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTERSTITIAL_MS, Interstitial } from './Interstitial'

describe('Interstitial', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows title and subtitle and dismisses itself after the duration', () => {
    const onDone = vi.fn()
    render(<Interstitial title="Alice vs Bob" subtitle="Series starts" onDone={onDone} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Alice vs Bob')
    expect(status).toHaveTextContent('Series starts')
    act(() => vi.advanceTimersByTime(INTERSTITIAL_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('waits for a tap when it has actions', () => {
    const watch = vi.fn()
    const onDone = vi.fn()
    render(
      <Interstitial
        title="Alice vs Bob"
        actions={[
          { label: 'Watch', onClick: watch, primary: true },
          { label: 'Dismiss', onClick: onDone },
        ]}
        onDone={onDone}
      />,
    )
    act(() => vi.advanceTimersByTime(INTERSTITIAL_MS * 3))
    expect(onDone).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Watch' }))
    expect(watch).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('stops its timer when unmounted', () => {
    const onDone = vi.fn()
    const view = render(<Interstitial title="Tie breaker" onDone={onDone} />)
    view.unmount()
    act(() => vi.advanceTimersByTime(INTERSTITIAL_MS + 10))
    expect(onDone).not.toHaveBeenCalled()
  })
})
