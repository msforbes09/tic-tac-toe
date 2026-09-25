import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayersSheet } from './PlayersSheet'
import type { PlayerSeen, PlayersPage, RoomDirectory } from '@/lib/roomDirectory'

const NOW = Date.UTC(2026, 8, 26, 12)
const player = (i: number, minutesAgo: number): PlayerSeen => ({ id: `p${i}`, nickname: `Player ${i}`, lastSeenAt: NOW - minutesAgo * 60_000 })

/** Only listPlayers is used; each call answers with the next page. */
const directory = (...pages: PlayersPage[]) => {
  const listPlayers = vi.fn(async () => pages.shift() ?? { players: [], next: null })
  return { dir: { listPlayers } as unknown as RoomDirectory, listPlayers }
}
const rows = () => screen.getAllByTestId('player-row')

async function open(props: Partial<Parameters<typeof PlayersSheet>[0]> & { dir?: RoomDirectory }) {
  const { dir, ...rest } = props
  render(<PlayersSheet open onOpenChange={() => {}} connected cloud={dir ? { deviceId: 'p1', directory: dir } : undefined} {...rest} />)
  await act(async () => {})
}

describe('PlayersSheet', () => {
  beforeEach(() => vi.setSystemTime(NOW))
  afterEach(() => vi.useRealTimers())

  it('lists each player with how long ago they were seen, marking this device', async () => {
    const { dir } = directory({ players: [player(1, 3), player(2, 60 * 26)], next: null })
    await open({ dir })
    expect(rows()).toHaveLength(2)
    expect(within(rows()[0]).getByText('Player 1')).toBeInTheDocument()
    expect(within(rows()[0]).getByText('you')).toBeInTheDocument()
    expect(within(rows()[0]).getByText('3 min ago')).toBeInTheDocument()
    expect(within(rows()[1]).getByText('1 day ago')).toBeInTheDocument()
    expect(within(rows()[1]).queryByText('you')).not.toBeInTheDocument()
    expect(within(rows()[1]).getByTestId('seen-at')).toHaveTextContent(/2026/)
    expect(screen.getByText('2 players')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('loads the next page on Show more and hides it after the last', async () => {
    const { dir, listPlayers } = directory(
      { players: [player(1, 1), player(2, 2)], next: 'c1' },
      { players: [player(3, 3)], next: null },
    )
    await open({ dir })
    expect(screen.getByText('2+ players')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    })
    expect(listPlayers).toHaveBeenLastCalledWith('c1')
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining('Player 1'), expect.stringContaining('Player 2'), expect.stringContaining('Player 3')])
    expect(screen.getByText('3 players')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('says offline without asking the directory', async () => {
    const { dir, listPlayers } = directory()
    await open({ dir, connected: false })
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(listPlayers).not.toHaveBeenCalled()
  })

  it('says when online play is not set up', async () => {
    await open({})
    expect(screen.getByText('Online play is not set up')).toBeInTheDocument()
  })

  it('says when the list fails to load', async () => {
    const dir = { listPlayers: vi.fn(async () => Promise.reject(new Error('down'))) } as unknown as RoomDirectory
    await open({ dir })
    expect(screen.getByText("Couldn't load players")).toBeInTheDocument()
  })
})
