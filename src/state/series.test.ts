import { describe, expect, it } from 'vitest'
import {
  SERIES_TARGET,
  firstMoveP1Symbol,
  isSeriesSnapshot,
  isTieBreak,
  seriesPhase,
  seriesReducer,
  seriesStatusText,
  snapshotOfSeries,
  startSeries,
  type SeriesState,
} from './series'

const alice = { deviceId: 'a', nickname: 'Alice' }
const bob = { deviceId: 'b', nickname: 'Bob' }
const fresh = () => startSeries('r', 'g', alice, bob)

const xPlayer = (s: SeriesState) => (s.game.p1Symbol === 'X' ? 'a' : 'b')
const oPlayer = (s: SeriesState) => (xPlayer(s) === 'a' ? 'b' : 'a')

/** X wins on the top row: X plays 0,1,2; O plays 3,4. Whoever holds X this game wins. */
function playXWins(s: SeriesState): SeriesState {
  const x = xPlayer(s)
  const o = oPlayer(s)
  for (const [who, i] of [[x, 0], [o, 3], [x, 1], [o, 4], [x, 2]] as const) s = seriesReducer(s, { type: 'MOVE', index: i, by: who })
  return s
}
/** A draw: X 0,1,5,6,7 · O 2,3,4,8. */
function playDraw(s: SeriesState): SeriesState {
  const x = xPlayer(s)
  const o = oPlayer(s)
  for (const [who, i] of [[x, 0], [o, 2], [x, 1], [o, 3], [x, 5], [o, 4], [x, 6], [o, 8], [x, 7]] as const)
    s = seriesReducer(s, { type: 'MOVE', index: i, by: who })
  return s
}
const next = (s: SeriesState) => seriesReducer(s, { type: 'NEXT_GAME' })

describe('series start and turn order', () => {
  it('the challenged player is X in game 1, then it alternates', () => {
    const s = fresh()
    expect(s.gameNumber).toBe(1)
    expect(s.game.p1Symbol).toBe('O')
    expect(firstMoveP1Symbol(1)).toBe('O')
    expect(firstMoveP1Symbol(2)).toBe('X')
    expect(firstMoveP1Symbol(3)).toBe('O')
    expect(seriesPhase(s)).toBe('playing')
    expect(s.game.settings.mode).toBe('online')
  })

  it('only the player to move can move, by device id', () => {
    const s = fresh()
    expect(seriesReducer(s, { type: 'MOVE', index: 0, by: 'a' })).toBe(s)
    const after = seriesReducer(s, { type: 'MOVE', index: 0, by: 'b' })
    expect(after.game.board[0]).toBe('X')
    expect(seriesReducer(after, { type: 'MOVE', index: 1, by: 'zzz' })).toBe(after)
    expect(seriesReducer(after, { type: 'MOVE', index: 0, by: 'a' })).toBe(after)
  })
})

describe('scoring and decision', () => {
  it('a win scores a point and Next game starts the next with swapped first move', () => {
    let s = playXWins(fresh())
    expect(s.score).toEqual({ challenger: 0, challenged: 1, draws: 0 })
    expect(seriesPhase(s)).toBe('between')
    expect(seriesReducer(s, { type: 'MOVE', index: 5, by: 'a' })).toBe(s)
    s = next(s)
    expect(s.gameNumber).toBe(2)
    expect(s.game.p1Symbol).toBe('X')
    expect(s.game.board.every((c) => c === null)).toBe(true)
    expect(s.score.challenged).toBe(1)
  })

  it('Next game does nothing mid-game', () => {
    const s = seriesReducer(fresh(), { type: 'MOVE', index: 0, by: 'b' })
    expect(next(s)).toBe(s)
  })

  it('a draw scores nothing for either side', () => {
    const s = playDraw(fresh())
    expect(s.score).toEqual({ challenger: 0, challenged: 0, draws: 1 })
    expect(seriesPhase(s)).toBe('between')
  })

  it('first to 6 wins, even before game 10', () => {
    // Alice (challenger) plays X in even games and wins them; odd games are draws. Alice reaches 6 in game 12? No:
    // she needs 6 wins from even games 2,4,6,8,10,12 → decided after game 10 with 5–0 (lead after 10). Make her win
    // every game instead by letting whoever is X lose: O wins on a column so the O player (Alice in odd games) wins.
    let s = fresh()
    let games = 0
    while (!s.result) {
      // X (Bob in odd games) plays 1,2,5 while O (Alice) plays 0,3,6 → O wins the left column.
      const x = xPlayer(s)
      const o = oPlayer(s)
      const aliceIsO = o === 'a'
      const moves = aliceIsO
        ? ([[x, 1], [o, 0], [x, 2], [o, 3], [x, 5], [o, 6]] as const) // O wins
        : ([[x, 0], [o, 1], [x, 3], [o, 2], [x, 6]] as const) // X (Alice) wins
      for (const [who, i] of moves) s = seriesReducer(s, { type: 'MOVE', index: i, by: who })
      games++
      if (!s.result) s = next(s)
    }
    expect(games).toBe(SERIES_TARGET)
    expect(s.score.challenger).toBe(SERIES_TARGET)
    expect(seriesPhase(s)).toBe('over')
    expect(s.result?.winner).toEqual(alice)
    expect(s.result?.reason).toBe('decided')
    expect(s.result?.games).toBe(SERIES_TARGET)
    expect(next(s)).toBe(s)
  })

  it('a lead after 10 games decides at game 10', () => {
    let s = fresh()
    for (let g = 1; g <= 10; g++) {
      s = g % 2 === 1 ? playDraw(s) : playXWins(s) // even games: Alice is X and wins
      if (g < 10) s = next(s)
    }
    expect(s.score).toEqual({ challenger: 5, challenged: 0, draws: 5 })
    expect(s.result?.winner).toEqual(alice)
    expect(s.result?.games).toBe(10)
  })

  it('level after 10 goes to a tie breaker until someone wins', () => {
    let t = fresh()
    for (let g = 1; g <= 10; g++) {
      t = playDraw(t)
      if (g < 10) t = next(t)
    }
    expect(t.result).toBeNull()
    expect(isTieBreak(t)).toBe(false)
    t = next(t)
    expect(isTieBreak(t)).toBe(true)
    expect(t.gameNumber).toBe(11)
    t = playDraw(t)
    expect(t.result).toBeNull()
    t = playXWins(next(t))
    expect(t.result?.reason).toBe('decided')
    expect(t.result?.games).toBe(12)
  })

  it('resigning loses whatever the score', () => {
    let s = playXWins(fresh()) // Bob leads 1–0
    s = seriesReducer(s, { type: 'RESIGN', by: 'b', reason: 'resigned', at: 99 })
    expect(s.result).toEqual({
      gameId: 'g',
      roomId: 'r',
      challengerId: 'a',
      challengedId: 'b',
      winner: alice,
      loser: bob,
      winnerScore: 0,
      loserScore: 1,
      games: 1,
      reason: 'resigned',
      endedAt: 99,
    })
    expect(seriesReducer(s, { type: 'MOVE', index: 5, by: 'a' })).toBe(s)
    expect(seriesReducer(s, { type: 'RESIGN', by: 'a', reason: 'resigned', at: 100 })).toBe(s)
  })

  it('a drop after the grace period is a loss with reason left, counting the unfinished game', () => {
    const s = seriesReducer(next(playXWins(fresh())), { type: 'RESIGN', by: 'a', reason: 'left', at: 5 })
    expect(s.result?.loser).toEqual(alice)
    expect(s.result?.reason).toBe('left')
    expect(s.result?.games).toBe(2)
  })
})

describe('snapshots and status text', () => {
  it('round-trips through a snapshot and validates it', () => {
    const s = seriesReducer(fresh(), { type: 'MOVE', index: 4, by: 'b' })
    const snap = snapshotOfSeries(s)
    expect(isSeriesSnapshot(snap)).toBe(true)
    expect(isSeriesSnapshot({ ...snap, score: { challenger: -1 } })).toBe(false)
    expect(isSeriesSnapshot({ ...snap, game: { nope: 1 } })).toBe(false)
    expect(isSeriesSnapshot({ ...snap, gameNumber: 0 })).toBe(false)
    const synced = seriesReducer(fresh(), { type: 'SYNC', snapshot: snap })
    expect(synced.game.board).toEqual(s.game.board)
    expect(synced.gameNumber).toBe(1)
    expect(synced.game.settings.mode).toBe('online')
    expect(synced.game.recorded).toBe(false)
  })

  it('a synced finished game on a fresh screen counts as recorded, a live one does not', () => {
    const won = playXWins(fresh())
    const late = seriesReducer(fresh(), { type: 'SYNC', snapshot: snapshotOfSeries(won) })
    expect(late.game.recorded).toBe(true)
    const mid = seriesReducer(fresh(), { type: 'SYNC', snapshot: snapshotOfSeries(seriesReducer(fresh(), { type: 'MOVE', index: 0, by: 'b' })) })
    const then = seriesReducer(mid, { type: 'SYNC', snapshot: snapshotOfSeries(won) })
    expect(then.game.recorded).toBe(false)
  })

  it('reads the status from each side and for watchers', () => {
    const s = fresh()
    expect(seriesStatusText(s, 'b')).toBe('Your move')
    expect(seriesStatusText(s, 'a')).toBe("Bob's turn")
    expect(seriesStatusText(s, null)).toBe("Bob's turn")
    const won = playXWins(s)
    expect(seriesStatusText(won, 'b')).toBe('You win!')
    expect(seriesStatusText(won, 'a')).toBe('You lost')
    expect(seriesStatusText(won, null)).toBe('Bob wins!')
    expect(seriesStatusText(playDraw(fresh()), null)).toBe("It's a draw")
  })

  it('a finished series is final: later snapshots are ignored', () => {
    const done = seriesReducer(fresh(), { type: 'RESIGN', by: 'b', reason: 'resigned', at: 1 })
    const live = seriesReducer(fresh(), { type: 'MOVE', index: 0, by: 'b' })
    expect(seriesReducer(done, { type: 'SYNC', snapshot: snapshotOfSeries(live) })).toBe(done)
  })

  it('SYNC copies only the known fields', () => {
    const snap = { ...snapshotOfSeries(fresh()), extra: 'nope' } as unknown as ReturnType<typeof snapshotOfSeries>
    const synced = seriesReducer(fresh(), { type: 'SYNC', snapshot: snap })
    expect(Object.keys(synced).sort()).toEqual(Object.keys(fresh()).sort())
  })
})
