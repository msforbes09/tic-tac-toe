import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBar, statusText } from './StatusBar'
import { createGameState, gameReducer } from '@/state/reducer'
import type { Settings } from '@/lib/types'

const settings: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }

describe('statusText online', () => {
  it('names the turn from each side', () => {
    const start = createGameState(settings)
    expect(statusText(start, 'p1')).toBe('Your move')
    expect(statusText(start, 'p2')).toBe("Friend's turn")
    const after = gameReducer(start, { type: 'MOVE', index: 0 })
    expect(statusText(after, 'p1')).toBe("Friend's turn")
    expect(statusText(after, 'p2')).toBe('Your move')
  })

  it('names the winner from each side', () => {
    let s = createGameState(settings)
    for (const i of [0, 3, 1, 4, 2]) s = gameReducer(s, { type: 'MOVE', index: i })
    expect(statusText(s, 'p1')).toBe('You win!')
    expect(statusText(s, 'p2')).toBe('You lost')
  })
})

describe('statusText bot', () => {
  it('says You lost when the bot wins', () => {
    let s = createGameState({ mode: 'bot', difficulty: 'easy', p1Symbol: 'O' })
    for (const i of [0, 3, 1, 4, 2]) s = gameReducer(s, { type: 'MOVE', index: i })
    expect(statusText(s)).toBe('You lost')
  })
})

describe('StatusBar message override', () => {
  it('shows the message instead of the turn', () => {
    render(<StatusBar state={createGameState(settings)} youSeat="p1" message="Waiting for your friend…" />)
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    expect(screen.queryByText('Your move')).not.toBeInTheDocument()
  })
})
