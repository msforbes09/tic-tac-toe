import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    expect(items[1]).toHaveTextContent(/player 1 wins/i)
  })

  it('offers no way to clear history', () => {
    const storage = fakeStorage([entry({ id: 'a' })])
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull()
  })

  it('labels wins by who played, whichever symbol they had', () => {
    const storage = fakeStorage([
      entry({ id: 'a', mode: 'bot', outcome: 'O', p1Symbol: 'O' }),
      entry({ id: 'b', mode: 'pvp', difficulty: null, outcome: 'X', p1Symbol: 'O' }),
    ])
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(/you win/i)
    expect(items[1]).toHaveTextContent(/player 2 wins/i)
  })

  it('shows your record against the bot per difficulty', () => {
    const storage = fakeStorage([
      entry({ id: 'a', difficulty: 'easy', outcome: 'X' }),
      entry({ id: 'b', difficulty: 'easy', outcome: 'draw' }),
      entry({ id: 'c', difficulty: 'hard', outcome: 'O' }),
    ])
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    expect(screen.getByRole('table', { name: /record against the bot/i })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Easy 1 0 1' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Medium 0 0 0' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Hard 0 1 0' })).toBeInTheDocument()
  })

  it('hides the bot record when only two-player games were played', () => {
    const storage = fakeStorage([entry({ id: 'a', mode: 'pvp', difficulty: null, outcome: 'X' })])
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows ten games at a time with View more', () => {
    const many = Array.from({ length: 25 }, (_, i) => entry({ id: `g${i}` }))
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={fakeStorage(many)} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: /view more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: /view more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(25)
    expect(screen.queryByRole('button', { name: /view more/i })).not.toBeInTheDocument()
  })

  it('has no View more button for ten games or fewer', () => {
    const ten = Array.from({ length: 10 }, (_, i) => entry({ id: `g${i}` }))
    render(<HistorySheet open={true} onOpenChange={() => {}} storage={fakeStorage(ten)} />)
    expect(screen.queryByRole('button', { name: /view more/i })).not.toBeInTheDocument()
  })

  it('starts from ten again when reopened', () => {
    const many = Array.from({ length: 25 }, (_, i) => entry({ id: `g${i}` }))
    const storage = fakeStorage(many)
    const { rerender } = render(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    fireEvent.click(screen.getByRole('button', { name: /view more/i }))
    rerender(<HistorySheet open={false} onOpenChange={() => {}} storage={storage} />)
    rerender(<HistorySheet open={true} onOpenChange={() => {}} storage={storage} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
  })

  it('Back closes the sheet', () => {
    const onOpenChange = vi.fn()
    render(<HistorySheet open={true} onOpenChange={onOpenChange} storage={fakeStorage()} />)
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onOpenChange).toHaveBeenCalled()
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })

  it('labels online games from your point of view', () => {
    const storage = fakeStorage([
      { id: 'a', timestamp: 1, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'X' },
      { id: 'b', timestamp: 2, mode: 'online', difficulty: null, outcome: 'X', p1Symbol: 'O' },
    ])
    render(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getByText('You win')).toBeInTheDocument()
    expect(screen.getByText('Friend wins')).toBeInTheDocument()
    expect(screen.getAllByText('Online')).toHaveLength(2)
    expect(screen.queryByRole('table', { name: /record against the bot/i })).not.toBeInTheDocument()
  })
})
