import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AchievementsSheet } from './AchievementsSheet'
import { EMPTY_STATE, SHOW_HIDDEN_KEY } from '@/lib/achievements'
import type { HistoryStorage } from '@/lib/history'

const memory = (): HistoryStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

const state = { ...EMPTY_STATE, unlocks: { 'hello-bot': new Date(2026, 8, 20).getTime(), 'the-immovable': 1 } }

describe('AchievementsSheet', () => {
  it('counts unlocks overall and per tier', () => {
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} storage={memory()} />)
    expect(screen.getByText('2 of 41 unlocked')).toBeInTheDocument()
    expect(screen.getByLabelText('Bronze')).toHaveTextContent('1/16')
    expect(screen.getByLabelText('Gold')).toHaveTextContent('1/10')
  })

  it('shows unlocked tiles with a date, keeps locked hidden ones secret, and reveals them with the switch', () => {
    const storage = memory()
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} storage={storage} />)
    expect(screen.getByText('Hello, Bot')).toBeInTheDocument()
    expect(screen.getByText('The Immovable')).toBeInTheDocument()
    expect(screen.getByText('Play 10 games')).toBeInTheDocument()
    expect(screen.queryByText('Night Owl')).toBeNull()
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0)
    expect(screen.getByText(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(2026, 8, 20)))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Show hidden' }))
    expect(screen.getByText('Night Owl')).toBeInTheDocument()
    expect(storage.getItem(SHOW_HIDDEN_KEY)).toBe('1')
  })

  it('remembers the switch', () => {
    const storage = memory()
    storage.setItem(SHOW_HIDDEN_KEY, '1')
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} storage={storage} />)
    expect(screen.getByRole('switch', { name: 'Show hidden' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Night Owl')).toBeInTheDocument()
  })
})
