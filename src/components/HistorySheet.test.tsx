import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HistorySheet } from './HistorySheet'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'

function fakeStorage(entries: HistoryEntry[] = []) {
  const map = new Map<string, string>()
  if (entries.length) map.set(STORAGE_KEY, JSON.stringify(entries))
  const storage: HistoryStorage & { has: () => boolean } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    has: () => map.has(STORAGE_KEY),
  }
  return storage
}

const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
  id: 'x',
  timestamp: Date.UTC(2026, 8, 23, 10, 30),
  mode: 'bot',
  difficulty: 'hard',
  outcome: 'draw',
  ...over,
})

describe('HistorySheet', () => {
  it('shows an empty state when there are no games', () => {
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={fakeStorage()} />)
    expect(screen.getByText(/no games yet/i)).toBeInTheDocument()
  })

  it('lists entries newest first with mode, difficulty, and outcome', () => {
    const storage = fakeStorage([
      entry({ id: 'a', outcome: 'O', mode: 'bot', difficulty: 'hard' }),
      entry({ id: 'b', outcome: 'X', mode: 'pvp', difficulty: null }),
    ])
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(/bot/i)
    expect(items[0]).toHaveTextContent(/hard/i)
    expect(items[0]).toHaveTextContent(/bot wins/i)
    expect(items[1]).toHaveTextContent(/two player/i)
    expect(items[1]).toHaveTextContent(/x wins/i)
  })

  it('clears history after confirmation', () => {
    const storage = fakeStorage([entry({ id: 'a' })])
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    fireEvent.click(screen.getByRole('button', { name: /clear history/i }))
    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))
    expect(storage.has()).toBe(false)
    expect(screen.getByText(/no games yet/i)).toBeInTheDocument()
  })
})
