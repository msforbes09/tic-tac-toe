import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HistorySheet } from './HistorySheet'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import { LADDER_KEY } from '@/lib/ladder'
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
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={fakeStorage()} />)
    expect(screen.getByText(/no bot games yet/i)).toBeInTheDocument()
  })

  it('lists bot games newest first as You won / You lost / Draw with the difficulty', () => {
    const storage = fakeStorage([
      entry({ id: 'a', outcome: 'O', difficulty: 'hard' }),
      entry({ id: 'b', outcome: 'X', difficulty: 'easy' }),
      entry({ id: 'c', outcome: 'draw', difficulty: 'medium' }),
    ])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('You lost')
    expect(items[0]).toHaveTextContent(/hard/i)
    expect(items[1]).toHaveTextContent('You won')
    expect(items[2]).toHaveTextContent('Draw')
  })

  it('labels wins by who played, whichever symbol they had', () => {
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={fakeStorage([entry({ id: 'a', outcome: 'O', p1Symbol: 'O' })])} />)
    expect(screen.getByRole('listitem')).toHaveTextContent('You won')
  })

  it('shows only bot games in bot mode', () => {
    const storage = fakeStorage([
      entry({ id: 'a', mode: 'pvp', difficulty: null, outcome: 'X' }),
      entry({ id: 'b', mode: 'online', difficulty: null, outcome: 'X' }),
    ])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(/no bot games yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/player 1/i)).not.toBeInTheDocument()
  })

  it('shows your record against the bot per difficulty', () => {
    const storage = fakeStorage([
      entry({ id: 'a', difficulty: 'easy', outcome: 'X' }),
      entry({ id: 'b', difficulty: 'easy', outcome: 'draw' }),
      entry({ id: 'c', difficulty: 'hard', outcome: 'O' }),
    ])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getByRole('table', { name: /record against the bot/i })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Easy 1 0 1' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Hard 0 1 0' })).toBeInTheDocument()
  })

  it('opens at the top: nothing in the list is focused so it cannot scroll into view', async () => {
    const storage = fakeStorage(Array.from({ length: 12 }, (_, i) => entry({ id: `g${i}`, timestamp: i })))
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    await act(async () => {})
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'View more' })).not.toHaveFocus()
    expect(screen.getByRole('button', { name: 'Back' })).not.toHaveFocus()
  })

  it('shows ten games at a time with View more and starts over when reopened', () => {
    const many = Array.from({ length: 25 }, (_, i) => entry({ id: `g${i}` }))
    const storage = fakeStorage(many)
    const { rerender } = render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: /view more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    rerender(<HistorySheet mode="bot" open={false} onOpenChange={() => {}} storage={storage} />)
    rerender(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
  })

  it('offers no way to clear history, and Back closes the sheet and reports the knock', () => {
    const onOpenChange = vi.fn()
    const onKnock = vi.fn()
    render(<HistorySheet mode="bot" open onOpenChange={onOpenChange} storage={fakeStorage([entry({ id: 'a' })])} onKnock={onKnock} />)
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
    expect(onKnock).toHaveBeenCalledWith('history:back')
  })
})

describe('HistorySheet two-player section', () => {
  it('shows an empty state, then a tally and rows from Player 1\'s side', () => {
    const none = fakeStorage([entry({ id: 'z', mode: 'bot' })])
    const view = render(<HistorySheet mode="pvp" open onOpenChange={() => {}} storage={none} />)
    expect(screen.getByText(/no two-player games yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    view.unmount()
    const storage = fakeStorage([
      entry({ id: 'a', mode: 'pvp', difficulty: null, outcome: 'X' }),
      entry({ id: 'b', mode: 'pvp', difficulty: null, outcome: 'O' }),
      entry({ id: 'c', mode: 'pvp', difficulty: null, outcome: 'draw' }),
      entry({ id: 'd', mode: 'pvp', difficulty: null, outcome: 'X' }),
    ])
    render(<HistorySheet mode="pvp" open onOpenChange={() => {}} storage={storage} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Player 1 won'),
      expect.stringContaining('Player 2 won'),
      expect.stringContaining('Draw'),
      expect.stringContaining('Player 1 won'),
    ])
    expect(screen.getByRole('table', { name: /two-player tally/i })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Player 1 2' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Player 2 1' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Draws 1' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /record against the bot/i })).not.toBeInTheDocument()
  })
})

describe('HistorySheet cloud rows', () => {
  const cloudDir = async (rows: Parameters<ReturnType<typeof createFakeDirectory>['addGames']>[0]) => {
    const dir = createFakeDirectory(hash)
    await dir.addGames(rows)
    return dir
  }

  it('shows the cloud rows for the player and mode alongside local ones, newest first', async () => {
    const dir = await cloudDir([
      { id: 'c1', playerId: 'me', mode: 'bot', difficulty: 'easy', rung: 3, outcome: 'won', symbol: 'X', playedAt: Date.UTC(2026, 8, 25) },
      { id: 'c2', playerId: 'me', mode: 'bot', difficulty: 'hard', rung: 25, outcome: 'lost', symbol: 'O', playedAt: Date.UTC(2026, 8, 24) },
      { id: 'c3', playerId: 'you', mode: 'bot', difficulty: 'hard', rung: 25, outcome: 'won', symbol: 'X', playedAt: Date.UTC(2026, 8, 26) },
    ])
    const storage = fakeStorage([entry({ id: 'local', mode: 'bot', outcome: 'draw', difficulty: 'medium' })])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} cloud={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('You won')
    expect(rows[0]).toHaveTextContent('Easy')
    expect(rows[1]).toHaveTextContent('You lost')
    expect(rows[2]).toHaveTextContent('Draw')
    expect(screen.getByRole('row', { name: 'Easy 1 0 0' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Medium 0 0 1' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Hard 0 1 0' })).toBeInTheDocument()
    expect(screen.queryByText(/you/i, { selector: 'li' })).toBeNull()
  })

  it('merges local games the cloud does not have yet, newest first', async () => {
    const dir = await cloudDir([
      { id: 'c1', playerId: 'me', mode: 'bot', difficulty: 'easy', rung: 3, outcome: 'won', symbol: 'X', playedAt: Date.UTC(2026, 8, 24) },
    ])
    const storage = fakeStorage([
      entry({ id: 'c1', mode: 'bot', outcome: 'X', difficulty: 'easy', timestamp: Date.UTC(2026, 8, 24), synced: true }),
      entry({ id: 'fresh', mode: 'bot', outcome: 'draw', difficulty: 'medium', timestamp: Date.UTC(2026, 8, 25) }),
    ])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} cloud={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Draw')
    expect(rows[1]).toHaveTextContent('You won')
  })

  it('does not refetch or reset paging when the parent re-renders with a fresh cloud object', async () => {
    const dir = await cloudDir(
      Array.from({ length: 15 }, (_, i) => ({
        id: `c${i}`, playerId: 'me', mode: 'bot' as const, difficulty: 'easy' as const, rung: 3, outcome: 'won' as const, symbol: 'X' as const, playedAt: i,
      })),
    )
    let calls = 0
    const original = dir.listGames
    dir.listGames = (...args) => {
      calls++
      return original(...args)
    }
    const storage = fakeStorage()
    const view = render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} cloud={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /view more/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(15)
    view.rerender(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} cloud={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    expect(screen.getAllByRole('listitem')).toHaveLength(15)
    expect(calls).toBe(1)
  })

  it('falls back to the local list when the cloud cannot be read', async () => {
    const dir = createFakeDirectory(hash)
    dir.listGames = async () => {
      throw new Error('offline')
    }
    const storage = fakeStorage([entry({ id: 'local', mode: 'bot', outcome: 'X', difficulty: 'medium' })])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} cloud={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    expect(screen.getByRole('listitem')).toHaveTextContent('You won')
  })
})

describe('HistorySheet climb graph', () => {
  it('draws the rungs of recent bot games, oldest first, in bot mode', () => {
    const storage = fakeStorage([
      entry({ id: 'a', timestamp: 1, rung: 11, outcome: 'X' }),
      entry({ id: 'b', timestamp: 3, rung: 13, outcome: 'X' }),
      entry({ id: 'c', timestamp: 2, rung: 12, outcome: 'draw' }),
      entry({ id: 'old', timestamp: 0, outcome: 'O' }),
    ])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    const graph = screen.getByRole('img', { name: /your climb/i })
    expect(graph).toHaveAccessibleDescription('Rungs 11, 12, 13')
    expect(screen.getByText('Your climb')).toBeInTheDocument()
    // The climb and the record sit side by side in one row that scrolls sideways.
    const row = screen.getByRole('group', { name: 'Climb and record' })
    expect(row).toContainElement(graph)
    expect(row).toContainElement(screen.getByRole('table', { name: /record against the bot/i }))
    expect(row.className).toMatch(/overflow-x-auto/)
  })

  it('needs at least two games with a rung', () => {
    const storage = fakeStorage([entry({ id: 'a', rung: 11 }), entry({ id: 'old', outcome: 'O' })])
    render(<HistorySheet mode="bot" open onOpenChange={() => {}} storage={storage} />)
    expect(screen.queryByRole('img', { name: /your climb/i })).not.toBeInTheDocument()
  })

  it('does not appear for two-player history', () => {
    const storage = fakeStorage([
      entry({ id: 'a', mode: 'pvp', difficulty: null, rung: 11 }),
      entry({ id: 'b', mode: 'pvp', difficulty: null, rung: 12 }),
    ])
    render(<HistorySheet mode="pvp" open onOpenChange={() => {}} storage={storage} />)
    expect(screen.queryByRole('img', { name: /your climb/i })).not.toBeInTheDocument()
  })
})

describe('HistorySheet badge', () => {
  it('shows the top-of-the-pack badge once the top has been held, with a share', async () => {
    const storage = fakeStorage([entry({ id: 'a' })])
    storage.setItem(LADDER_KEY, JSON.stringify({ rung: 30, streak: 0, topHeldAt: Date.UTC(2026, 8, 25, 12), topHeldCount: 3 }))
    const share = vi.fn().mockResolvedValue('shared')
    render(<HistorySheet mode="bot" open={true} onOpenChange={() => {}} storage={storage} share={share} siteUrl="https://ttt.test/" />)
    expect(screen.getByText('Top of the pack')).toBeInTheDocument()
    expect(screen.getByText(/Held 3 times/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(share).toHaveBeenCalledWith('https://ttt.test/', 'I held the unbeatable tic-tac-toe bot to a draw. Your move.')
  })

  it('says Held once for a single draw at the top, and shows no badge before the top is held', () => {
    const once = fakeStorage()
    once.setItem(LADDER_KEY, JSON.stringify({ rung: 30, streak: 0, topHeldAt: 1, topHeldCount: 1 }))
    const view = render(<HistorySheet mode="bot" open={true} onOpenChange={() => {}} storage={once} />)
    expect(screen.getByText(/Held once/)).toBeInTheDocument()
    view.unmount()
    const none = fakeStorage()
    none.setItem(LADDER_KEY, JSON.stringify({ rung: 30, streak: 0, topHeldAt: null, topHeldCount: 0 }))
    render(<HistorySheet mode="bot" open={true} onOpenChange={() => {}} storage={none} />)
    expect(screen.queryByText('Top of the pack')).not.toBeInTheDocument()
  })
})

describe('HistorySheet online section', () => {
  it('says online play is not set up when there is no online setup', () => {
    render(<HistorySheet mode="online" open onOpenChange={() => {}} storage={fakeStorage()} />)
    expect(screen.getByText(/online play is not set up/i)).toBeInTheDocument()
    expect(screen.queryByText(/no bot games yet/i)).not.toBeInTheDocument()
  })

  it('lists my series from the database, newest first, from my point of view', async () => {
    const dir = createFakeDirectory(hash)
    await dir.createRoom({ id: 'r', name: 'Quiet Edge', creatorId: 'z', ownerHash: await hash('t') })
    await dir.addResult(series({ gameId: 'g1', endedAt: 1 }))
    await dir.addResult(series({ gameId: 'g2', endedAt: 2, winner: me, loser: zed, winnerScore: 6, loserScore: 4, reason: 'resigned' }))
    await dir.addResult(series({ gameId: 'g3', endedAt: 3, winner: { deviceId: 'q', nickname: 'Quinn' }, loser: zed, challengedId: 'q' }))
    render(<HistorySheet mode="online" open onOpenChange={() => {}} storage={fakeStorage()} online={{ deviceId: 'me', directory: dir }} />)
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
    render(<HistorySheet mode="online" open onOpenChange={() => {}} storage={fakeStorage()} online={{ deviceId: 'me', directory: dir }} />)
    await act(async () => {})
    expect(screen.getByText(/no series yet/i)).toBeInTheDocument()
    await act(async () => {
      await dir.addResult(series({ gameId: 'g1' }))
    })
    expect(screen.getByText('You lost to Zed')).toBeInTheDocument()
  })
})
