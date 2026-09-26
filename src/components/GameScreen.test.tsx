import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOT_DELAY_MS, GameScreen } from './GameScreen'
import type { Feedback, FeedbackEvent } from '@/lib/feedback'
import type { Settings } from '@/lib/types'
import { STORAGE_KEY, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import { LADDER_KEY, type Ladder } from '@/lib/ladder'
import { BANTER } from '@/lib/banter'
import { SETUP_KEY } from '@/lib/setup'
import { chooseMove } from '@/lib/bot'

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

/** A Feedback player that just remembers what it was asked to play. */
function recorder() {
  const played: FeedbackEvent[] = []
  const feedback: Feedback & { played: FeedbackEvent[] } = {
    play: (event) => {
      played.push(event)
    },
    played,
  }
  return feedback
}

const pvp: Settings = { mode: 'pvp', difficulty: 'easy', p1Symbol: 'X' }
const hardBot: Settings = { mode: 'bot', difficulty: 'hard', p1Symbol: 'X' }
const easyBot = (p1Symbol: Settings['p1Symbol']): Settings => ({ mode: 'bot', difficulty: 'easy', p1Symbol })

/** The number shown next to a score label. */
const scoreOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent

const cell = (n: number) => screen.getByRole('button', { name: new RegExp(`^Cell ${n},`) })

describe('GameScreen feedback', () => {

  it('plays a move for each mark and a win for the winning mark', () => {
    const feedback = recorder()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(feedback.played).toEqual([
      { kind: 'start' },
      { kind: 'move', player: 'X' },
      { kind: 'move', player: 'O' },
      { kind: 'move', player: 'X' },
      { kind: 'move', player: 'O' },
      { kind: 'win', player: 'X' },
    ])
  })

  it('plays a start cue when the screen opens and again on New game', () => {
    const feedback = recorder()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
    expect(feedback.played).toEqual([{ kind: 'start' }])
    fireEvent.click(cell(1))
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(feedback.played).toEqual([{ kind: 'start' }, { kind: 'move', player: 'X' }, { kind: 'start' }])
  })

  it('always plays sound: there is no mute control', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.queryByRole('button', { name: /mute/i })).not.toBeInTheDocument()
  })
})

describe('GameScreen two-player', () => {
  it('saves two-player games from Player 1\'s side and reports them with no ladder', () => {
    const storage = fakeStorage()
    const onRecorded = vi.fn()
    render(<GameScreen settings={pvp} storage={storage} feedback={recorder()} onBack={() => {}} onRecorded={onRecorded} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.getByText('Player 1 wins!')).toBeInTheDocument()
    expect(storage.entries()).toEqual([expect.objectContaining({ mode: 'pvp', difficulty: null, outcome: 'X', p1Symbol: 'X' })])
    expect(storage.entries()[0].rung).toBeUndefined()
    expect(onRecorded).toHaveBeenCalledTimes(1)
    expect(onRecorded).toHaveBeenCalledWith(expect.objectContaining({ mode: 'pvp' }), null)
  })

  it('alternates X and O and names whose turn it is', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
    expect(screen.getByText("Player 2's turn")).toBeInTheDocument()
    fireEvent.click(cell(2))
    expect(cell(2)).toHaveAccessibleName('Cell 2, O')
  })

  it('announces the winner and highlights the line', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.getByText('Player 1 wins!')).toBeInTheDocument()
    expect(cell(1)).toHaveAttribute('data-highlighted', 'true')
  })

  it('announces a draw', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={pvp} storage={storage} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 2, 3, 5, 4, 6, 8, 7, 9]) fireEvent.click(cell(n))
    expect(screen.getByText("It's a draw")).toBeInTheDocument()
    expect(storage.entries()).toEqual([expect.objectContaining({ mode: 'pvp', outcome: 'draw' })])
  })

  it('New game clears the board and keeps playing', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument()
    expect(cell(1)).toHaveAccessibleName('Cell 1, empty')
  })

  it('keeps a session score across games', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(scoreOf('Player 1')).toBe('0')
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(scoreOf('Player 1')).toBe('1')
    expect(scoreOf('Player 2')).toBe('0')
    expect(scoreOf('Draws')).toBe('0')
  })

  it('hands X to the other player after a draw', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 2, 3, 5, 4, 6, 8, 7, 9]) fireEvent.click(cell(n))
    expect(scoreOf('Draws')).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(screen.getByText("Player 2's turn")).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(cell(1)).toHaveAccessibleName('Cell 1, X')
  })

  it('never celebrates a two-player win', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
  })

  it('Back calls onBack', () => {
    const onBack = vi.fn()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={onBack} />)
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
    render(<GameScreen settings={hardBot} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText('Your move')).toBeInTheDocument()
    fireEvent.click(cell(1))
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    expect(cell(2)).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    const os = screen.getAllByRole('button', { name: /, O$/ })
    expect(os).toHaveLength(1)
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it('lets the hard bot think longer than the old fixed beat on a quiet board', () => {
    render(<GameScreen settings={hardBot} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    fireEvent.click(cell(1))
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS - 400)
    })
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  it("plays feedback for the bot's move too", () => {
    const feedback = recorder()
    render(<GameScreen settings={hardBot} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
    fireEvent.click(cell(1))
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    expect(feedback.played).toEqual([
      { kind: 'start' },
      { kind: 'move', player: 'X' },
      { kind: 'move', player: 'O' },
    ])
  })

  it('records a bot game with its difficulty', () => {
    const storage = fakeStorage()
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} />)
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
    expect(entries[0]).toMatchObject({ mode: 'bot', difficulty: 'hard', p1Symbol: 'X' })
    expect(['O', 'draw']).toContain(entries[0].outcome)
  })

  it('reports each recorded bot game with the ladder after it', () => {
    const onRecorded = vi.fn()
    render(<GameScreen settings={hardBot} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} onRecorded={onRecorded} />)
    for (let turn = 0; turn < 5; turn++) {
      const empty = screen.queryAllByRole('button', { name: /, empty$/ }).filter((el) => !el.hasAttribute('disabled'))
      if (empty.length === 0) break
      fireEvent.click(empty[0])
      act(() => {
        vi.advanceTimersByTime(BOT_DELAY_MS)
      })
    }
    expect(onRecorded).toHaveBeenCalledTimes(1)
    const [entry, ladder] = onRecorded.mock.calls[0] as [unknown, { rung: number; updatedAt: number }]
    expect(entry).toMatchObject({ mode: 'bot', difficulty: 'hard' })
    expect(ladder.rung).toBeGreaterThanOrEqual(1)
    expect(ladder.updatedAt).toBeGreaterThan(0)
  })

  it('lets the bot open as X when you pick O', () => {
    render(<GameScreen settings={{ ...hardBot, p1Symbol: 'O' }} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
    expect(screen.getAllByRole('button', { name: /, X$/ })).toHaveLength(1)
    expect(screen.getByText('Your move')).toBeInTheDocument()
  })

  describe('against an easy bot that always takes the first free cell', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    const botReplies = () =>
      act(() => {
        vi.advanceTimersByTime(BOT_DELAY_MS)
      })

    it('celebrates and scores when you beat the bot', () => {
      const feedback = recorder()
      render(<GameScreen settings={easyBot('X')} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
      // You take the middle row; the bot fills cells 1 and 2.
      for (const n of [4, 5, 6]) {
        fireEvent.click(cell(n))
        botReplies()
      }
      expect(screen.getByText('You win!')).toBeInTheDocument()
      expect(screen.getByTestId('celebration')).toBeInTheDocument()
      expect(scoreOf('You')).toBe('1')
      expect(feedback.played.at(-1)).toEqual({ kind: 'win', player: 'X' })
    })

    it('plays the lose sound and does not celebrate when the bot wins', () => {
      const feedback = recorder()
      render(<GameScreen settings={easyBot('O')} storage={fakeStorage()} feedback={feedback} onBack={() => {}} />)
      // Bot (X) takes cells 1, 2, 3 across the top; you answer on the middle row.
      botReplies()
      fireEvent.click(cell(4))
      botReplies()
      fireEvent.click(cell(5))
      botReplies()
      expect(screen.getByText('You lost')).toBeInTheDocument()
      expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
      expect(scoreOf('Bot')).toBe('1')
      expect(feedback.played.at(-1)).toEqual({ kind: 'lose' })
    })

    it('lets the bot open the next game after it wins', () => {
      render(<GameScreen settings={easyBot('X')} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
      // You play the right column; the bot takes cells 1, 2, 3 and wins.
      for (const n of [6, 9]) {
        fireEvent.click(cell(n))
        botReplies()
      }
      fireEvent.click(cell(5))
      botReplies()
      expect(screen.getByText('You lost')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /new game/i }))
      expect(screen.getByText('Bot is thinking…')).toBeInTheDocument()
    })
  })
})

describe('GameScreen ladder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const botTurn = () =>
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
  const ladderIn = (storage: HistoryStorage) => JSON.parse(storage.getItem(LADDER_KEY) ?? 'null')
  const setupIn = (storage: HistoryStorage) => JSON.parse(storage.getItem(SETUP_KEY) ?? 'null')
  const seeded = (rung: number | null) => {
    const storage = fakeStorage()
    storage.setItem(LADDER_KEY, JSON.stringify({ rung }))
    return storage
  }
  /** Plays the human's move, then lets the bot answer. */
  const play = (...cells: number[]) => {
    for (const n of cells) {
      fireEvent.click(cell(n))
      botTurn()
    }
  }

  it('labels the first game with the picked band, then with the band the rung is really in', () => {
    // Rung 3 picking Hard lands on 14, a Medium bot. With rng 0 the bot plays first-best, so X loses fast.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const storage = seeded(3)
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} />)
    expect(screen.getByText('Bot · Hard')).toBeInTheDocument()
    // The nudge to 14 is only in memory until a game finishes; backing out would leave 3 saved.
    expect(ladderIn(storage).rung).toBe(3)
    play(1, 2, 4)
    expect(screen.getByText('You lost')).toBeInTheDocument()
    expect(screen.getByText('Bot · Medium')).toBeInTheDocument()
    expect(ladderIn(storage).rung).toBe(13)
    expect(setupIn(storage).difficulty).toBe('medium')
    expect(storage.entries()[0]).toMatchObject({ mode: 'bot', difficulty: 'hard', rung: 14 })
  })

  it('reports a promotion win as an achievement event, with no note and no start cue', () => {
    // Rung 10 always blocks and otherwise takes the first free cell; a fork beats it.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const feedback = recorder()
    const storage = seeded(10)
    const onAchievement = vi.fn()
    render(<GameScreen settings={easyBot('X')} storage={storage} feedback={feedback} onBack={() => {}} onAchievement={onAchievement} />)
    play(1, 5, 7)
    fireEvent.click(cell(4))
    expect(screen.getByText('You win!')).toBeInTheDocument()
    expect(screen.queryByText(/Promoted/)).not.toBeInTheDocument()
    expect(feedback.played.at(-1)).toEqual({ kind: 'win', player: 'X' })
    expect(ladderIn(storage).rung).toBe(11)
    expect(onAchievement).toHaveBeenCalledTimes(1)
    expect(onAchievement).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'game', mode: 'bot', result: 'win', symbol: 'X', band: 'easy', rungBefore: 10, rungAfter: 11 }),
    )
    const { board, finishedAt } = onAchievement.mock.calls[0][0]
    expect(board.filter((c: string | null) => c === 'X')).toHaveLength(4)
    expect(finishedAt).toBeGreaterThan(0)
  })

  it('reports a win that reaches rung 30 with the rungs, and shows no top-of-the-pack note', () => {
    // Rung 29 with rng 0.99: wins and blocks, otherwise the last free cell, and the best-move roll fails.
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const storage = seeded(29)
    const onAchievement = vi.fn()
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} onAchievement={onAchievement} />)
    play(1, 3, 7)
    fireEvent.click(cell(4))
    expect(screen.getByText('You win!')).toBeInTheDocument()
    expect(screen.queryByText(/Top of the pack/)).not.toBeInTheDocument()
    expect(ladderIn(storage).rung).toBe(30)
    expect(onAchievement).toHaveBeenCalledWith(expect.objectContaining({ result: 'win', band: 'hard', rungBefore: 29, rungAfter: 30 }))
  })

  it('reports a draw at rung 30 and shows no card', () => {
    const storage = seeded(30)
    const onAchievement = vi.fn()
    const view = render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} onAchievement={onAchievement} />)
    const drawOut = () => {
      // The human plays perfectly too, so the game is a draw. Either side may open.
      for (let turn = 0; turn < 10; turn++) {
        if (screen.queryByText("It's a draw")) return
        const empty = screen.queryAllByRole('button', { name: /, empty$/ }).filter((el) => !el.hasAttribute('disabled'))
        if (empty.length > 0) {
          const board = screen.getAllByRole('button', { name: /^Cell/ }).map((el) => {
            const label = el.getAttribute('aria-label') ?? ''
            return label.endsWith('X') ? 'X' : label.endsWith('O') ? 'O' : null
          })
          fireEvent.click(cell(chooseMove(board, 30) + 1))
        }
        botTurn()
      }
    }
    drawOut()
    expect(screen.getByText("It's a draw")).toBeInTheDocument()
    expect(screen.queryByText('That was the unbeatable bot.')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
    expect(ladderIn(storage).rung).toBe(30)
    expect(onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'game', mode: 'bot', result: 'draw', rungBefore: 30, rungAfter: 30 }))
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument()
    view.unmount()
  })

  it('reports a two-player game with no ladder fields, from Player 1 as X', () => {
    const onAchievement = vi.fn()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} onAchievement={onAchievement} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(onAchievement).toHaveBeenCalledTimes(1)
    const event = onAchievement.mock.calls[0][0]
    expect(event).toMatchObject({ kind: 'game', mode: 'pvp', result: 'win', symbol: 'X' })
    expect(event.band).toBeUndefined()
    expect(event.rungBefore).toBeUndefined()
    expect(event.rungAfter).toBeUndefined()
  })

  it('reports a two-player loss when Player 2 wins', () => {
    const onAchievement = vi.fn()
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} onAchievement={onAchievement} />)
    for (const n of [1, 4, 2, 5, 9, 6]) fireEvent.click(cell(n))
    expect(onAchievement).toHaveBeenCalledWith(expect.objectContaining({ mode: 'pvp', result: 'loss' }))
  })

  it('does not save the nudge until a game finishes, even under StrictMode which runs initialisers twice', () => {
    const storage = seeded(30)
    const view = render(
      <StrictMode>
        <GameScreen settings={{ ...hardBot, difficulty: 'medium' }} storage={storage} feedback={recorder()} onBack={() => {}} />
      </StrictMode>,
    )
    // Rung 30 picking Medium plays at 22: the chip shows the picked band and nothing is written yet.
    expect(screen.getByText('Bot · Medium')).toBeInTheDocument()
    expect(ladderIn(storage).rung).toBe(30)
    view.unmount()
    expect(ladderIn(storage).rung).toBe(30)
  })

  it('saves the nudged rung, moved by the result, once the first game finishes', () => {
    // Rung 3 picking Hard plays at 14; the loss then saves 13, nudged once and moved once.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const storage = seeded(3)
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} />)
    play(1, 2, 4)
    expect(screen.getByText('You lost')).toBeInTheDocument()
    expect(ladderIn(storage).rung).toBe(13)
    expect(storage.entries()[0]).toMatchObject({ rung: 14 })
  })

  it('shows the rung and streak on the chip in developer mode; the chip is never a button', () => {
    const storage = fakeStorage()
    storage.setItem(LADDER_KEY, JSON.stringify({ rung: 17, streak: 2 }))
    render(<GameScreen settings={{ ...hardBot, difficulty: 'medium' }} storage={storage} feedback={recorder()} onBack={() => {}} dev />)
    expect(screen.getByText('Bot · Medium · 17 · +2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bot ·/ })).toBeNull()
  })

  it('shows no streak on the chip when there is none, and no chip button outside developer mode', () => {
    render(<GameScreen settings={{ ...hardBot, difficulty: 'medium' }} storage={seeded(17)} feedback={recorder()} onBack={() => {}} dev />)
    expect(screen.getByText('Bot · Medium · 17')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bot ·/ })).toBeNull()
  })

  it('reports board taps for the knock, and the completing tap overrides the cell and voids the game', () => {
    const storage = fakeStorage()
    // Says the knock completed on the tap of the occupied centre.
    const onKnock = vi.fn((event: string) => event === 'cell:4')
    render(<GameScreen settings={pvp} storage={storage} feedback={recorder()} onBack={() => {}} onKnock={onKnock} />)
    for (const n of [1, 5, 9, 3]) fireEvent.click(cell(n))
    expect(onKnock).toHaveBeenLastCalledWith('cell:2')
    fireEvent.click(cell(5).parentElement!)
    expect(onKnock).toHaveBeenLastCalledWith('cell:4')
    expect(cell(5)).toHaveAccessibleName('Cell 5, X')
    expect(screen.getByText('Game voided')).toBeInTheDocument()
    expect(screen.queryByText(/wins/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
    expect(cell(2)).toBeDisabled()
    expect(storage.entries()).toHaveLength(0)
  })

  it('does not record a voided bot game or move the ladder', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const storage = seeded(5)
    const onKnock = vi.fn((event: string) => event === 'cell:4')
    const onAchievement = vi.fn()
    render(<GameScreen settings={easyBot('X')} storage={storage} feedback={recorder()} onBack={() => {}} onKnock={onKnock} onAchievement={onAchievement} />)
    play(1)
    fireEvent.click(cell(2).parentElement!) // the bot took cell 2; irrelevant to the knock here
    fireEvent.click(cell(5))
    play(9)
    fireEvent.click(cell(5).parentElement!)
    expect(screen.getByText('Game voided')).toBeInTheDocument()
    expect(storage.entries()).toHaveLength(0)
    expect(ladderIn(storage).rung).toBe(5)
    expect(onAchievement).not.toHaveBeenCalled()
  })

  it('starts a first-ever bot game at the bottom of the picked band', () => {
    // Nothing is saved until the game ends; the recorded game shows the rung it was played at.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const storage = fakeStorage()
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} />)
    expect(storage.getItem(LADDER_KEY)).toBeNull()
    play(1, 2, 4)
    expect(screen.getByText('You lost')).toBeInTheDocument()
    expect(storage.entries()[0]).toMatchObject({ rung: 21 })
    // A first loss at the band's bottom is held there, so 21 is what gets saved.
    expect(ladderIn(storage).rung).toBe(21)
  })

  describe('leaving mid-way resigns', () => {
    const start = (onBack = vi.fn()) => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const storage = seeded(12)
      const onAchievement = vi.fn()
      render(<GameScreen settings={{ ...easyBot('X'), difficulty: 'medium' }} storage={storage} feedback={recorder()} onBack={onBack} onAchievement={onAchievement} />)
      return { storage, onAchievement, onBack }
    }

    it('once each side has moved, disables New game and turns Back into Resign', () => {
      start()
      fireEvent.click(cell(1))
      expect(screen.getByRole('button', { name: 'New game' })).toBeEnabled()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
      botTurn()
      expect(screen.getByRole('button', { name: 'New game' })).toBeDisabled()
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '← Resign' })).toBeInTheDocument()
    })

    it('Resign asks first; Keep playing changes nothing', () => {
      const { storage, onBack } = start()
      play(1)
      fireEvent.click(screen.getByRole('button', { name: '← Resign' }))
      expect(screen.getByText('Resign this game?')).toBeInTheDocument()
      expect(screen.getByText('It counts as a loss.')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
      expect(screen.queryByText('Resign this game?')).not.toBeInTheDocument()
      expect(onBack).not.toHaveBeenCalled()
      expect(storage.entries()).toEqual([])
    })

    it('Yes, resign records a loss and leaves', () => {
      const { storage, onAchievement, onBack } = start()
      play(1)
      fireEvent.click(screen.getByRole('button', { name: '← Resign' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, resign' }))
      expect(onBack).toHaveBeenCalled()
      expect(storage.entries()).toHaveLength(1)
      expect(storage.entries()[0]).toMatchObject({ mode: 'bot', outcome: 'O', p1Symbol: 'X', rung: 12 })
      expect(ladderIn(storage).rung).toBe(11)
      expect(onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'game', result: 'loss', rungBefore: 12, rungAfter: 11 }))
    })

    it('Back before the bot has answered records nothing', () => {
      const { storage, onAchievement, onBack } = start()
      fireEvent.click(cell(1))
      fireEvent.click(screen.getByRole('button', { name: /back/i }))
      expect(onBack).toHaveBeenCalled()
      expect(storage.entries()).toEqual([])
      expect(onAchievement).not.toHaveBeenCalled()
    })

    it('a finished game offers New game and Back again', () => {
      start()
      play(1, 2, 4)
      expect(screen.getByText('You lost')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'New game' })).toBeEnabled()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  it('offers a plain new game after a loss at rung 30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const storage = seeded(30)
    render(<GameScreen settings={hardBot} storage={storage} feedback={recorder()} onBack={() => {}} />)
    play(1, 2, 4)
    expect(screen.getByText('You lost')).toBeInTheDocument()
    expect(ladderIn(storage).rung).toBe(29)
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take it back' })).not.toBeInTheDocument()
  })
})

describe('GameScreen banter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  const botTurn = () =>
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS)
    })
  const play = (...cells: number[]) => {
    for (const n of cells) {
      fireEvent.click(cell(n))
      botTurn()
    }
  }
  const seeded = (ladder: Partial<Ladder>) => {
    const storage = fakeStorage()
    storage.setItem(LADDER_KEY, JSON.stringify({ rung: null, streak: 0, ...ladder }))
    return storage
  }

  it('lets the bot comment on an ordinary win, in the band the game was played at, until New game', () => {
    render(<GameScreen settings={easyBot('X')} storage={seeded({ rung: 5 })} feedback={recorder()} onBack={() => {}} />)
    play(1, 5, 7)
    fireEvent.click(cell(4))
    expect(screen.getByText('You win!')).toBeInTheDocument()
    expect(screen.getByText(BANTER.friendly.easy.win[0])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    expect(screen.queryByText(BANTER.friendly.easy.win[0])).not.toBeInTheDocument()
  })

  it('does not say the same thing two games in a row', () => {
    render(<GameScreen settings={easyBot('X')} storage={seeded({ rung: 5 })} feedback={recorder()} onBack={() => {}} />)
    play(1, 5, 7)
    fireEvent.click(cell(4))
    const first = screen.getByText(BANTER.friendly.easy.win[0])
    expect(first).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    // Game 2: I hold X again and win the same way; Math.random still returns 0.
    play(1, 5, 7)
    fireEvent.click(cell(4))
    expect(screen.queryByText(BANTER.friendly.easy.win[0])).not.toBeInTheDocument()
    expect(screen.getByText(BANTER.friendly.easy.win[1])).toBeInTheDocument()
  })

  it('talks trash instead when the bot is aggressive', () => {
    render(<GameScreen settings={easyBot('X')} storage={seeded({ rung: 5 })} feedback={recorder()} onBack={() => {}} tone="cocky" />)
    play(1, 5, 7)
    fireEvent.click(cell(4))
    expect(screen.getByText(BANTER.cocky.easy.win[0])).toBeInTheDocument()
  })

  it('comments on a loss', () => {
    // Rung 3 picking Hard lands on 14, a Medium bot that wins fast with rng 0.
    render(<GameScreen settings={hardBot} storage={seeded({ rung: 3 })} feedback={recorder()} onBack={() => {}} />)
    play(1, 2, 4)
    expect(screen.getByText('You lost')).toBeInTheDocument()
    expect(screen.getByText(BANTER.friendly.medium.loss[0])).toBeInTheDocument()
  })

  it('lets the bot comment on a promotion win too, since the toast carries the moment', () => {
    render(<GameScreen settings={easyBot('X')} storage={seeded({ rung: 10 })} feedback={recorder()} onBack={() => {}} />)
    play(1, 5, 7)
    fireEvent.click(cell(4))
    expect(screen.queryByText('Promoted to Medium')).not.toBeInTheDocument()
    expect(screen.getByText(BANTER.friendly.easy.win[0])).toBeInTheDocument()
  })

  it('says nothing after a two-player game', () => {
    render(<GameScreen settings={pvp} storage={fakeStorage()} feedback={recorder()} onBack={() => {}} />)
    for (const n of [1, 4, 2, 5, 3]) fireEvent.click(cell(n))
    expect(screen.getByText('Player 1 wins!')).toBeInTheDocument()
    for (const line of [...BANTER.friendly.easy.win, ...BANTER.friendly.easy.loss])
      expect(screen.queryByText(line)).not.toBeInTheDocument()
  })

  it('shows a streak pill from the third straight win, and never for losses', () => {
    render(<GameScreen settings={easyBot('X')} storage={seeded({ rung: 5, streak: 2 })} feedback={recorder()} onBack={() => {}} />)
    expect(screen.queryByText(/in a row/)).not.toBeInTheDocument()
    play(1, 5, 7)
    fireEvent.click(cell(4))
    expect(screen.getByText('3 in a row')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    expect(screen.getByText('3 in a row')).toBeInTheDocument()
  })

  it('shows no streak pill for a losing streak', () => {
    render(<GameScreen settings={easyBot('X')} storage={seeded({ rung: 5, streak: -3 })} feedback={recorder()} onBack={() => {}} />)
    expect(screen.queryByText(/in a row/)).not.toBeInTheDocument()
  })
})
