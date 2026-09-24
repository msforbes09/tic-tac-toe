import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HistorySheet } from './HistorySheet'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import type { SeriesResult } from '@/lib/room'
import { createFakeDirectory } from '@/lib/roomDirectory'

function fakeStorage(entries: HistoryEntry[] = []) {
  const map = new Map<string, string>()
  if (entries.length) map.set(STORAGE_KEY, JSON.stringify(entries))
  const storage: HistoryStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
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

const me = { deviceId: 'me', nickname: 'Alice' }
const zed = { deviceId: 'z', nickname: 'Zed' }
const series = (over: Partial<SeriesResult>): SeriesResult => ({
  gameId: 'g',
  roomId: 'r',
  challengerId: 'z',
  challengedId: 'me',
  winner: zed,
  loser: me,
  winnerScore: 6,
  loserScore: 2,
  games: 8,
  reason: 'decided',
  endedAt: Date.UTC(2026, 8, 24, 9, 0),
  ...over,
})
const hash = async (t: string) => `h:${t}`

describe('HistorySheet bot section', () => {
  it('shows an empty state when there are no games', () => {
    render(<HistorySheet open onOpenChange={() => {}} storage={fakeStorage()} />)
    expect(screen.getByText(/no bot games yet/i)).toBeInTheDocument()
  })

  it('lists bot games newest first as You won / You lost / Draw with the difficulty', () => {
    const storage = fakeStorage([
      entry({ id: 'a', outcome: 'O', difficulty: 'hard' }),
      entry({ id: 'b', outcome: 'X', difficulty: 'easy' }),
      entry({ id: 'c', outcome: 'draw', difficulty: 'medium' }),
    ])
    render(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('You lost')
    expect(items[0]).toHaveTextContent(/hard/i)
    expect(items[1]).toHaveTextContent('You won')
    expect(items[2]).toHaveTextContent('Draw')
  })

  it('labels wins by who played, whichever symbol they had', () => {
    render(<HistorySheet open onOpenChange={() => {}} storage={fakeStorage([entry({ id: 'a', outcome: 'O', p1Symbol: 'O' })])} />)
    expect(screen.getByRole('listitem')).toHaveTextContent('You won')
  })

  it('ignores two-player and locally stored online games', () => {
    const storage = fakeStorage([
      entry({ id: 'a', mode: 'pvp', difficulty: null, outcome: 'X' }),
      entry({ id: 'b', mode: 'online', difficulty: null, outcome: 'X' }),
    ])
    render(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(/no bot games yet/i)).toBeInTheDocument()
  })

  it('shows your record against the bot per difficulty', () => {
    const storage = fakeStorage([
      entry({ id: 'a', difficulty: 'easy', outcome: 'X' }),
      entry({ id: 'b', difficulty: 'easy', outcome: 'draw' }),
      entry({ id: 'c', difficulty: 'hard', outcome: 'O' }),
    ])
    render(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getByRole('table', { name: /record against the bot/i })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Easy 1 0 1' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Hard 0 1 0' })).toBeInTheDocument()
  })

  it('shows ten games at a time with View more and starts over when reopened', () => {
    const many = Array.from({ length: 25 }, (_, i) => entry({ id: `g${i}` }))
    const storage = fakeStorage(many)
    const { rerender } = render(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: /view more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    rerender(<HistorySheet open={false} onOpenChange={() => {}} storage={storage} />)
    rerender(<HistorySheet open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
  })

  it('offers no way to clear history, and Back closes the sheet', () => {
    const onOpenChange = vi.fn()
    render(<HistorySheet open onOpenChange={onOpenChange} storage={fakeStorage([entry({ id: 'a' })])} />)
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })
})

describe('HistorySheet online section', () => {
  it('is absent without an online setup', () => {
    render(<HistorySheet open onOpenChange={() => {}} storage={fakeStorage()} />)
    expect(screen.queryByRole('heading', { name: /online/i })).not.toBeInTheDocument()
  })

  it('lists my series from the database, newest first, from my point of view', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    await dir.addResult(series({ gameId: 'g1', endedAt: 1 }))
    await dir.addResult(series({ gameId: 'g2', endedAt: 2, winner: me, loser: zed, winnerScore: 6, loserScore: 4, reason: 'resigned' }))
    await dir.addResult(series({ gameId: 'g3', endedAt: 3, winner: { deviceId: 'q', nickname: 'Quinn' }, loser: zed, challengedId: 'q' }))
    render(<HistorySheet open onOpenChange={() => {}} storage={fakeStorage()} online={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    expect(screen.getByRole('heading', { name: /online/i })).toBeInTheDocument()
    const rows = screen.getAllByTestId('series-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('You beat Zed')
    expect(rows[0]).toHaveTextContent('6–4')
    expect(rows[0]).toHaveTextContent(/resigned/i)
    expect(rows[1]).toHaveTextContent('You lost to Zed')
    expect(rows[1]).toHaveTextContent('2–6')
  })

  it('shows an empty state and updates live when a series finishes', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    render(<HistorySheet open onOpenChange={() => {}} storage={fakeStorage()} online={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    expect(screen.getByText(/no series yet/i)).toBeInTheDocument()
    await act(async () => {
      await dir.addResult(series({ gameId: 'g1' }))
    })
    expect(screen.getByText('You lost to Zed')).toBeInTheDocument()
  })
})
