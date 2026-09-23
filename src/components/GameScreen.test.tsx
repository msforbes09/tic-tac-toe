import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOT_DELAY_MS, GameScreen } from './GameScreen'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'

function fakeStorage() {
  const map = new Map<string, string>()
  const storage: HistoryStorage & { entries: () => HistoryEntry[] } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    entries: () => JSON.parse(map.get(STORAGE_KEY) ?? '[]'),
  }
  return storage
}

const cell = (n: number) => screen.getByRole('button', { name: new RegExp(`^Cell ${n},`) })

describe('GameScreen two-player', () => {
  it('alternates X and O and shows whose turn it is', () => {
    render(<GameScreen settings={{ mode: 'pvp', difficulty: 'easy' }} storage={fakeStorage()} onBack={() => {}} />)
    expect(screen.getByText("X's turn")).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
    expect(screen.getByText("O's turn")).toBeInTheDocument()
    fireEvent.click(cell(2))
    expect(cell(2)).toHaveAccessibleName('Cell 2, O')
  })

  it('announces the winner and records exactly one history entry', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={{ mode: 'pvp', difficulty: 'easy' }} storage={storage} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.getByText('X wins!')).toBeInTheDocument()
    expect(cell(1)).toHaveAttribute('data-highlighted', 'true')
    const entries = storage.entries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ mode: 'pvp', difficulty: null, outcome: 'X' })
    expect(typeof entries[0].timestamp).toBe('number')
  })

  it('records a draw', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={{ mode: 'pvp', difficulty: 'easy' }} storage={storage} onBack={() => {}} />)
    for (const n of [1, 2, 3, 5, 4, 6, 8, 7, 9]) fireEvent.click(cell(n))
    expect(screen.getByText("It's a draw")).toBeInTheDocument()
    expect(storage.entries()[0]).toMatchObject({ outcome: 'draw' })
  })

  it('New game clears the board and keeps playing', () => {
    render(<GameScreen settings={{ mode: 'pvp', difficulty: 'easy' }} storage={fakeStorage()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(screen.getByText("X's turn")).toBeInTheDocument()
    expect(cell(1)).toHaveAccessibleName('Cell 1, empty')
  })

  it('Back calls onBack', () => {
    const onBack = vi.fn()
    render(<GameScreen settings={{ mode: 'pvp', difficulty: 'easy' }} storage={fakeStorage()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('GameScreen versus bot', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets the bot reply after the delay and disables the board while thinking', () => {
    render(<GameScreen settings={{ mode: 'bot', difficulty: 'hard' }} storage={fakeStorage()} onBack={() => {}} />)
    expect(screen.getByText('Your turn')).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    expect(cell(2)).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    const os = screen.getAllByRole('button', { name: /, O$/ })
    expect(os).toHaveLength(1)
    expect(screen.getByText('Your turn')).toBeInTheDocument()
  })

  it('records a bot game with its difficulty', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={{ mode: 'bot', difficulty: 'hard' }} storage={storage} onBack={() => {}} />)
    // Play until the game ends; hard bot forces a draw or win for O at worst.
    for (let turn = 0; turn < 5; turn++) {
      const empty = screen.queryAllByRole('button', { name: /, empty$/ }).filter((el) => !el.hasAttribute('disabled'))
      if (empty.length === 0) break
      fireEvent.click(empty[0])
      act(() => {
        vi.advanceTimersByTime(BOT_DELAY_MS)
      })
    }
    const entries = storage.entries()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ mode: 'bot', difficulty: 'hard' })
    expect(['O', 'draw']).toContain(entries[0].outcome)
  })
})
