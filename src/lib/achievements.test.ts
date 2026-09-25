import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_KEY,
  EMPTY_PROGRESS,
  EMPTY_STATE,
  achievementById,
  defaultBadge,
  isAchievementId,
  loadAchievements,
  merge,
  record,
  saveAchievements,
  wornBadge,
  type AchievementEvent,
  type AchievementState,
  type GameEvent,
  type SeriesEvent,
} from './achievements'
import type { HistoryStorage } from './history'
import type { Board } from './types'

const EMPTY_BOARD: Board = [null, null, null, null, null, null, null, null, null]
const X_ROW: Board = ['X', 'X', 'X', 'O', 'O', null, null, null, null]
const X_DIAG: Board = ['X', 'O', null, 'O', 'X', null, null, null, 'X']
const X_MIDDLE_ROW: Board = ['O', null, 'O', 'X', 'X', 'X', null, null, null]
const NOON = new Date(2026, 8, 26, 12).getTime()

const game = (over: Partial<GameEvent> = {}): AchievementEvent => ({
  kind: 'game',
  mode: 'bot',
  result: 'win',
  board: X_ROW,
  symbol: 'X',
  finishedAt: NOON,
  band: 'easy',
  rungBefore: 1,
  rungAfter: 2,
  ...over,
})
const online = (over: Partial<GameEvent> = {}): AchievementEvent =>
  game({ mode: 'online', band: undefined, rungBefore: undefined, rungAfter: undefined, opponentId: 'o1', opponentBadge: null, ...over })
const run = (events: AchievementEvent[], start: AchievementState = EMPTY_STATE) => {
  let state = start
  const unlocked: string[] = []
  for (const e of events) {
    const r = record(state, e, 100)
    state = r.state
    unlocked.push(...r.unlocked)
  }
  return { state, unlocked }
}
const many = (n: number, over: Partial<GameEvent> = {}) => Array.from({ length: n }, () => game(over))

const memory = (): HistoryStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

describe('catalogue', () => {
  it('has 41 achievements with unique ids and one platinum', () => {
    expect(ACHIEVEMENTS).toHaveLength(41)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(41)
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'platinum').map((a) => a.id)).toEqual(['grand-master'])
  })

  it('looks up by id and validates ids', () => {
    expect(achievementById('hello-bot').name).toBe('Hello, Bot')
    expect(isAchievementId('hello-bot')).toBe(true)
    expect(isAchievementId('nope')).toBe(false)
  })
})

describe('storage', () => {
  it('round-trips and returns the empty state for nothing or bad data', () => {
    const s = memory()
    expect(loadAchievements(s)).toEqual(EMPTY_STATE)
    const state = { ...EMPTY_STATE, unlocks: { 'hello-bot': 5 }, badge: 'hello-bot' as const, updatedAt: 9 }
    saveAchievements(s, state)
    expect(loadAchievements(s)).toEqual(state)
    s.setItem(ACHIEVEMENTS_KEY, '{oops')
    expect(loadAchievements(s)).toEqual(EMPTY_STATE)
  })

  it('drops unknown unlock ids and bad counters but keeps the rest', () => {
    const s = memory()
    s.setItem(
      ACHIEVEMENTS_KEY,
      JSON.stringify({
        progress: { ...EMPTY_STATE.progress, botDraws: 'x', promotions: 2 },
        unlocks: { 'hello-bot': 5, future: 6 },
        badge: 'future',
        updatedAt: 1,
      }),
    )
    const loaded = loadAchievements(s)
    expect(loaded.unlocks).toEqual({ 'hello-bot': 5 })
    expect(loaded.progress.botDraws).toBe(0)
    expect(loaded.progress.promotions).toBe(2)
    expect(loaded.badge).toBeUndefined()
  })
})

describe('record: firsts', () => {
  it('first games per mode and full circle', () => {
    expect(run([game({ mode: 'pvp' })]).unlocked).toContain('opening-move')
    expect(run([game()]).unlocked).toContain('hello-bot')
    expect(run([online()]).unlocked).toContain('going-live')
    const { unlocked } = run([game({ mode: 'pvp' }), game(), online()])
    expect(unlocked).toContain('full-circle')
    expect(unlocked.filter((u) => u === 'hello-bot')).toHaveLength(1)
  })

  it('first bot win, per band, and a draw', () => {
    expect(run([game({ band: 'medium' })]).unlocked).toEqual(expect.arrayContaining(['beat-the-machine', 'middle-ground']))
    expect(run([game({ result: 'loss' })]).unlocked).not.toContain('beat-the-machine')
    expect(run([game({ result: 'draw', board: EMPTY_BOARD })]).unlocked).toContain('quick-draw')
  })

  it('stamps the unlock time and bumps updatedAt', () => {
    const { state } = run([game()])
    expect(state.unlocks['hello-bot']).toBe(100)
    expect(state.updatedAt).toBe(100)
  })
})

describe('record: ladder', () => {
  it('promotion, top, immovable, deep end', () => {
    expect(run([game({ rungBefore: 10, rungAfter: 11 })]).unlocked).toContain('moving-up')
    expect(run([game({ rungBefore: 9, rungAfter: 10 })]).unlocked).not.toContain('moving-up')
    expect(run([game({ rungBefore: 29, rungAfter: 30 })]).unlocked).toContain('top-of-the-pack')
    expect(run([game({ result: 'draw', rungBefore: 30, rungAfter: 30 })]).unlocked).toContain('the-immovable')
    expect(run([game({ result: 'draw', rungBefore: 29, rungAfter: 29 })]).unlocked).not.toContain('the-immovable')
    expect(run([game({ rungBefore: 25, rungAfter: 26 })]).unlocked).toContain('deep-end')
    expect(run([game({ rungBefore: 24, rungAfter: 25 })]).unlocked).not.toContain('deep-end')
  })

  it('bounce back needs a win right after a loss at the top', () => {
    const loss = game({ result: 'loss', rungBefore: 30, rungAfter: 29 })
    expect(run([loss, game({ rungBefore: 29, rungAfter: 30 })]).unlocked).toContain('bounce-back')
    expect(run([loss, game({ result: 'draw', rungBefore: 29, rungAfter: 29 }), game({ rungBefore: 29, rungAfter: 30 })]).unlocked).not.toContain('bounce-back')
    expect(run([game({ result: 'loss', rungBefore: 29, rungAfter: 28 }), game({ rungBefore: 28, rungAfter: 29 })]).unlocked).not.toContain('bounce-back')
  })
})

describe('record: streaks and counts', () => {
  it('win streaks at 5 and 10, unbeaten at 5 and 10, losses at 5', () => {
    expect(run(many(4)).unlocked).not.toContain('high-five')
    expect(run(many(5)).unlocked).toContain('high-five')
    expect(run(many(10)).unlocked).toContain('perfect-ten')
    const drawsAndWins = [game(), game({ result: 'draw' }), game(), game({ result: 'draw' }), game()]
    expect(run(drawsAndWins).unlocked).toContain('unbroken')
    expect(run(drawsAndWins).unlocked).not.toContain('high-five')
    expect(run([...drawsAndWins, ...drawsAndWins]).unlocked).toContain('untouchable')
    expect(run(many(4, { result: 'loss' })).unlocked).not.toContain('rough-night')
    expect(run(many(5, { result: 'loss' })).unlocked).toContain('rough-night')
  })

  it('a loss resets the win and unbeaten streaks; a draw resets win and loss streaks', () => {
    const { progress } = run([game(), game(), game({ result: 'loss' })]).state
    expect(progress.winStreak).toBe(0)
    expect(progress.unbeatenStreak).toBe(0)
    expect(progress.lossStreak).toBe(1)
    const drawn = run([game({ result: 'loss' }), game({ result: 'draw' })]).state.progress
    expect(drawn.lossStreak).toBe(0)
    expect(drawn.winStreak).toBe(0)
    expect(drawn.unbeatenStreak).toBe(1)
  })

  it('online games feed the streaks too', () => {
    expect(run([game(), game(), online(), online(), online()]).unlocked).toContain('high-five')
  })

  it('two-player games leave every streak alone but count as games', () => {
    const { progress } = run([game(), game(), game({ mode: 'pvp', result: 'loss' })]).state
    expect(progress.winStreak).toBe(2)
    expect(progress.unbeatenStreak).toBe(2)
    expect(progress.lossStreak).toBe(0)
    expect(progress.games.pvp).toBe(1)
  })

  it('regular at 10 games any mode, century at 100 bot games, stalemate at 10 draws, marathon at 500, fifty and two hundred wins', () => {
    expect(run(many(9, { mode: 'pvp' })).unlocked).not.toContain('regular')
    expect(run(many(10, { mode: 'pvp' })).unlocked).toContain('regular')
    const hundred = run(many(100, { result: 'draw', board: EMPTY_BOARD }))
    expect(hundred.unlocked).toContain('century')
    expect(hundred.unlocked).toContain('stalemate')
    expect(run(many(9, { result: 'draw' })).unlocked).not.toContain('stalemate')
    expect(run(many(500, { mode: 'pvp' })).unlocked).toContain('marathon')
    expect(run(many(49)).unlocked).not.toContain('fifty')
    expect(run(many(50)).unlocked).toContain('fifty')
    expect(run(many(50, { mode: 'pvp' })).unlocked).not.toContain('fifty')
    expect(run(many(200)).unlocked).toContain('two-hundred')
  })
})

describe('record: board and clock', () => {
  it('fast hands, diagonals, centre', () => {
    expect(run([game({ board: X_ROW })]).unlocked).toContain('fast-hands')
    expect(run([game({ board: ['X', 'X', 'X', 'O', 'O', 'X', 'O', null, null] })]).unlocked).not.toContain('fast-hands')
    const diag = run(Array.from({ length: 10 }, () => game({ board: X_DIAG, mode: 'pvp' })))
    expect(diag.unlocked).toContain('sly-diagonal')
    expect(diag.unlocked).toContain('centre-stage')
    const middle = run(Array.from({ length: 10 }, () => game({ board: X_MIDDLE_ROW })))
    expect(middle.unlocked).toContain('centre-stage')
    expect(middle.unlocked).not.toContain('sly-diagonal')
    const column: Board = ['O', 'X', null, 'O', 'X', null, null, 'X', null]
    expect(run(Array.from({ length: 10 }, () => game({ board: column }))).unlocked).not.toContain('sly-diagonal')
    expect(run(Array.from({ length: 9 }, () => game({ board: X_DIAG }))).unlocked).not.toContain('sly-diagonal')
    expect(run([game({ board: X_ROW, symbol: 'O', result: 'loss' })]).state.progress.centreWins).toBe(0)
  })

  it('night owl and early bird use the local clock', () => {
    const at = (h: number) => new Date(2026, 8, 26, h, 30).getTime()
    expect(run([game({ finishedAt: at(1) })]).unlocked).toContain('night-owl')
    expect(run([game({ finishedAt: at(4) })]).unlocked).not.toContain('night-owl')
    expect(run([game({ finishedAt: at(5) })]).unlocked).toContain('early-bird')
    expect(run([game({ finishedAt: at(7) })]).unlocked).not.toContain('early-bird')
  })

  it('week warrior counts distinct local days', () => {
    const day = (d: number) => new Date(2026, 8, d, 12).getTime()
    const events = [1, 1, 2, 3, 4, 5, 6].map((d) => game({ finishedAt: day(d) }))
    expect(run(events).unlocked).not.toContain('week-warrior')
    expect(run([...events, game({ finishedAt: day(7) })]).unlocked).toContain('week-warrior')
  })
})

const series = (over: Partial<SeriesEvent> = {}): AchievementEvent => ({
  kind: 'series', won: true, mine: 6, theirs: 2, trailedBy3: false, tieBreak: false, roomId: 'r1', opponentId: 'o1', opponentBadge: null, ...over,
})

describe('record: series, rooms, watching', () => {
  it('closer, clean sweep, comeback, tiebreaker, giant killer', () => {
    expect(run([series()]).unlocked).toContain('closer')
    expect(run([series({ won: false })]).unlocked).not.toContain('closer')
    expect(run([series({ theirs: 0 })]).unlocked).toContain('clean-sweep')
    expect(run([series({ theirs: 1 })]).unlocked).not.toContain('clean-sweep')
    expect(run([series({ trailedBy3: true })]).unlocked).toContain('comeback-kid')
    expect(run([series({ tieBreak: true })]).unlocked).toContain('tiebreaker')
    expect(run([series({ opponentBadge: 'the-immovable' })]).unlocked).toContain('giant-killer')
    expect(run([series({ won: false, opponentBadge: 'the-immovable' })]).unlocked).not.toContain('giant-killer')
  })

  it('frequent flyer over 3 rooms and old rivals over 3 series with one opponent', () => {
    expect(run([series({ roomId: 'a' }), series({ roomId: 'b' }), series({ roomId: 'b' })]).unlocked).not.toContain('frequent-flyer')
    expect(run([series({ roomId: 'a' }), series({ roomId: 'b' }), series({ roomId: 'c' })]).unlocked).toContain('frequent-flyer')
    expect(run([series(), series(), series({ opponentId: 'o2' })]).unlocked).not.toContain('old-rivals')
    expect(run([series(), series(), series()]).unlocked).toContain('old-rivals')
  })

  it('caps the opponent map at 50 by dropping the oldest', () => {
    const { progress } = run(Array.from({ length: 51 }, (_, i) => series({ opponentId: String(i) }))).state
    expect(Object.keys(progress.opponents)).toHaveLength(50)
    expect(progress.opponents['0']).toBeUndefined()
  })

  it('landlord and front row', () => {
    expect(run([{ kind: 'room-created' }]).unlocked).toContain('landlord')
    expect(run([{ kind: 'watched' }]).unlocked).toContain('front-row')
  })

  it('grand master fires with the last of the others', () => {
    const all = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.id !== 'grand-master' && a.id !== 'landlord').map((a) => [a.id, 1]))
    const { unlocked } = run([{ kind: 'room-created' }], { ...EMPTY_STATE, unlocks: all })
    expect(unlocked).toEqual(['landlord', 'grand-master'])
  })
})

describe('badge', () => {
  it('defaults to the highest tier, newest among equals, and honours an explicit choice or None', () => {
    const unlocks = { 'hello-bot': 1, 'high-five': 2, closer: 3, 'perfect-ten': 4, untouchable: 5 }
    expect(defaultBadge(unlocks)).toBe('untouchable')
    expect(defaultBadge({})).toBeNull()
    expect(wornBadge({ ...EMPTY_STATE, unlocks })).toBe('untouchable')
    expect(wornBadge({ ...EMPTY_STATE, unlocks, badge: 'closer' })).toBe('closer')
    expect(wornBadge({ ...EMPTY_STATE, unlocks, badge: null })).toBeNull()
    expect(wornBadge({ ...EMPTY_STATE, unlocks, badge: 'landlord' })).toBe('untouchable')
  })
})

describe('merge', () => {
  const local: AchievementState = { progress: { ...EMPTY_PROGRESS, botDraws: 2 }, unlocks: { 'hello-bot': 5, 'quick-draw': 7 }, badge: 'quick-draw', updatedAt: 10 }

  it('keeps local when the cloud is empty and reports the cloud behind', () => {
    expect(merge(local, null)).toEqual({ state: local, localChanged: false, cloudBehind: true })
    expect(merge(EMPTY_STATE, null)).toEqual({ state: EMPTY_STATE, localChanged: false, cloudBehind: false })
  })

  it('unions unlocks keeping the earliest time and takes progress and badge from the newer copy', () => {
    const cloud: AchievementState = { progress: { ...EMPTY_PROGRESS, botDraws: 5 }, unlocks: { 'hello-bot': 3, landlord: 9 }, badge: null, updatedAt: 20 }
    const r = merge(local, cloud)
    expect(r.state.unlocks).toEqual({ 'hello-bot': 3, 'quick-draw': 7, landlord: 9 })
    expect(r.state.progress.botDraws).toBe(5)
    expect(r.state.badge).toBeNull()
    expect(r.state.updatedAt).toBe(20)
    expect(r.localChanged).toBe(true)
    expect(r.cloudBehind).toBe(true)
  })

  it('an older cloud copy still contributes unlocks the local one lacks', () => {
    const cloud: AchievementState = { progress: EMPTY_PROGRESS, unlocks: { landlord: 1 }, updatedAt: 1 }
    const r = merge(local, cloud)
    expect(r.state.unlocks.landlord).toBe(1)
    expect(r.state.progress.botDraws).toBe(2)
    expect(r.state.badge).toBe('quick-draw')
    expect(r.localChanged).toBe(true)
    expect(r.cloudBehind).toBe(true)
  })

  it('identical copies change nothing', () => {
    expect(merge(local, { ...local })).toEqual({ state: local, localChanged: false, cloudBehind: false })
  })
})
