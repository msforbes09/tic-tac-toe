# Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forty-one PlayStation-style achievements that unlock on the device the moment they happen, sync to Supabase whenever there is a connection, show in their own sheet, and put one chosen badge above the player's name online.

**Architecture:** A pure `lib/achievements.ts` holds the catalogue, a flat `Progress` record, and `record(state, event, now)` which applies one event and returns new unlocks. Screens emit events; `App` owns the state, the local write-ahead copy, the cloud mirror, the toast queue, and the wiped-device check. Presence and series shapes carry an optional `badge` id.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind v4, shadcn/base-ui Sheet, lucide-react icons, Vitest + RTL, Supabase (table + RPC).

**Spec:** `docs/superpowers/specs/2026-09-26-achievements-design.md`

## Global Constraints

- lib/ and state/ never import React or touch the DOM.
- TDD: failing test first, minimal code, refactor. Full suite plus `npx tsc -b --noEmit` (then delete `tsconfig.tsbuildinfo`) before claiming done.
- No `Co-Authored-By` trailer. Never edit `.env`.
- Sandbox: no heredocs, no `git -C`, no paths with spaces; use the Edit tool for multi-line edits.
- base-ui `AlertDialogAction` / `AlertDialogCancel` close the dialog themselves. Modal dialogs hide the rest from role queries (`hidden: true` in tests).
- Mobile-first single column, max 420 px, dark theme only.
- Storage keys: `tic-tac-toe:achievements`, `tic-tac-toe:show-hidden`, `tic-tac-toe:registered`.
- Tier colours: bronze `#cd7f32`, silver `#b8c0c8`, gold `#f2c14e`, platinum `#9fe3ff`.
- Streaks and the two win-count achievements count bot and online games only; two-player games never touch them.

## Review Focus

1. A stored `unlocks` object with an unknown id (from a newer client) must load without crashing and keep the unknown id out of the counts. Test in Task 1.
2. A `game` event for a two-player game must leave `winStreak`, `unbeatenStreak`, `lossStreak` untouched, not reset them. Test in Task 2.
3. `merge` with a cloud copy that has an older `updatedAt` but an unlock the local copy lacks must keep that unlock. Test in Task 3.
4. `shouldWipe` must be false when the directory call fails (null player because of an error is indistinguishable, so the caller only calls it after a successful load). Test in Task 4 via `wipeOnLaunch` returning false on rejection.
5. `RoomPresence` with `badge: 123` (wrong type) must be rejected by `isRoomPresence`; a missing `badge` must be accepted. Test in Task 6.

---

### Task 1: Catalogue, state, load and save

**Files:**
- Create: `src/lib/achievements.ts`
- Test: `src/lib/achievements.test.ts`

**Interfaces:**
- Produces: `Tier`, `AchievementId`, `Achievement`, `ACHIEVEMENTS`, `achievementById(id)`, `TIER_ORDER`, `TIER_COLOR`, `Progress`, `AchievementState`, `EMPTY_PROGRESS`, `EMPTY_STATE`, `ACHIEVEMENTS_KEY`, `SHOW_HIDDEN_KEY`, `loadAchievements(storage)`, `saveAchievements(storage, state)`, `isAchievementId(v)`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, ACHIEVEMENTS_KEY, EMPTY_STATE, achievementById, isAchievementId, loadAchievements, saveAchievements } from './achievements'
import type { HistoryStorage } from './history'

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
    s.setItem(ACHIEVEMENTS_KEY, JSON.stringify({ progress: { ...EMPTY_STATE.progress, botDraws: 'x', promotions: 2 }, unlocks: { 'hello-bot': 5, future: 6 }, badge: 'future', updatedAt: 1 }))
    const loaded = loadAchievements(s)
    expect(loaded.unlocks).toEqual({ 'hello-bot': 5 })
    expect(loaded.progress.botDraws).toBe(0)
    expect(loaded.progress.promotions).toBe(2)
    expect(loaded.badge).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

```ts
import type { HistoryStorage } from './history'
import type { Board, Difficulty, Mode, Player } from './types'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum']
export const TIER_COLOR: Record<Tier, string> = { bronze: '#cd7f32', silver: '#b8c0c8', gold: '#f2c14e', platinum: '#9fe3ff' }

const CATALOGUE = [
  ['opening-move', 'bronze', 'Opening Move', 'Play your first two-player game', 'Play', false],
  ['hello-bot', 'bronze', 'Hello, Bot', 'Play your first bot game', 'Bot', false],
  ['beat-the-machine', 'bronze', 'Beat the Machine', 'Beat the bot for the first time', 'Cpu', false],
  ['easy-does-it', 'bronze', 'Easy Does It', 'Beat the bot on Easy', 'Leaf', false],
  ['middle-ground', 'bronze', 'Middle Ground', 'Beat the bot on Medium', 'Scale', false],
  ['hard-feelings', 'bronze', 'Hard Feelings', 'Beat the bot on Hard', 'Flame', false],
  ['moving-up', 'bronze', 'Moving Up', 'Get promoted to a harder bot', 'TrendingUp', false],
  ['going-live', 'bronze', 'Going Live', 'Play your first online game', 'Wifi', false],
  ['front-row', 'bronze', 'Front Row', 'Watch a series', 'Eye', false],
  ['landlord', 'bronze', 'Landlord', 'Create a room', 'DoorOpen', false],
  ['quick-draw', 'bronze', 'Quick Draw', 'Draw against the bot', 'Equal', false],
  ['regular', 'bronze', 'Regular', 'Play 10 games', 'Calendar', false],
  ['night-owl', 'bronze', 'Night Owl', 'Finish a game between midnight and 4 am', 'Moon', true],
  ['rough-night', 'bronze', 'Rough Night', 'Lose 5 games in a row', 'CloudRain', true],
  ['early-bird', 'bronze', 'Early Bird', 'Finish a game between 5 and 7 am', 'Sunrise', true],
  ['full-circle', 'bronze', 'Full Circle', 'Play all three modes', 'Orbit', true],
  ['closer', 'silver', 'Closer', 'Win your first series', 'Flag', false],
  ['high-five', 'silver', 'High Five', 'Win 5 games in a row', 'Hand', false],
  ['unbroken', 'silver', 'Unbroken', 'Go 5 games without losing', 'Shield', false],
  ['century', 'silver', 'Century', 'Play 100 bot games', 'Hash', false],
  ['comeback-kid', 'silver', 'Comeback Kid', 'Win a series after trailing by 3', 'Undo2', true],
  ['bounce-back', 'silver', 'Bounce Back', 'Win right after losing at the top', 'ArrowUpFromLine', true],
  ['frequent-flyer', 'silver', 'Frequent Flyer', 'Play series in 3 different rooms', 'Plane', false],
  ['fifty', 'silver', 'Fifty', 'Win 50 games against the bot or online', 'Medal', false],
  ['fast-hands', 'silver', 'Fast Hands', 'Win in three moves', 'Zap', true],
  ['sly-diagonal', 'silver', 'Sly Diagonal', 'Win on a diagonal 10 times', 'MoveDiagonal', true],
  ['centre-stage', 'silver', 'Centre Stage', 'Win through the middle 10 times', 'Target', true],
  ['stalemate', 'silver', 'Stalemate', 'Draw against the bot 10 times', 'Handshake', true],
  ['old-rivals', 'silver', 'Old Rivals', 'Play 3 series against the same opponent', 'Users', true],
  ['week-warrior', 'silver', 'Week Warrior', 'Play on 7 different days', 'CalendarDays', true],
  ['perfect-ten', 'gold', 'Perfect Ten', 'Win 10 games in a row', 'Sparkles', false],
  ['untouchable', 'gold', 'Untouchable', 'Go 10 games without losing', 'ShieldCheck', false],
  ['clean-sweep', 'gold', 'Clean Sweep', 'Win a series 6–0', 'Brush', false],
  ['top-of-the-pack', 'gold', 'Top of the Pack', 'Reach the top of the bot ladder', 'Mountain', false],
  ['the-immovable', 'gold', 'The Immovable', 'Hold the unbeatable bot to a draw', 'Anchor', true],
  ['marathon', 'gold', 'Marathon', 'Play 500 games', 'Footprints', false],
  ['tiebreaker', 'gold', 'Tiebreaker', 'Win a series in the tie breaker', 'Swords', true],
  ['two-hundred', 'gold', 'Two Hundred', 'Win 200 games against the bot or online', 'Crown', false],
  ['giant-killer', 'gold', 'Giant Killer', 'Beat a player wearing The Immovable', 'Axe', true],
  ['deep-end', 'gold', 'Deep End', 'Beat the bot near the top of the ladder', 'Waves', true],
  ['grand-master', 'platinum', 'Grand Master', 'Unlock everything else', 'Gem', false],
] as const

export type AchievementId = (typeof CATALOGUE)[number][0]
export type Achievement = { id: AchievementId; tier: Tier; name: string; description: string; icon: string; hidden: boolean }

export const ACHIEVEMENTS: Achievement[] = CATALOGUE.map(([id, tier, name, description, icon, hidden]) => ({ id, tier, name, description, icon, hidden }))
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
export const isAchievementId = (v: unknown): v is AchievementId => typeof v === 'string' && BY_ID.has(v as AchievementId)
export const achievementById = (id: AchievementId): Achievement => BY_ID.get(id) as Achievement

export type Progress = {
  games: Record<Mode, number>
  wins: Record<Mode, number>
  botWinsByBand: Record<Difficulty, number>
  botDraws: number
  promotions: number
  seriesPlayed: number
  seriesWon: number
  winStreak: number
  unbeatenStreak: number
  lossStreak: number
  rooms: string[]
  opponents: Record<string, number>
  days: number
  lastDay: string | null
  diagonalWins: number
  centreWins: number
  lostAtTop: boolean
  watched: boolean
  roomsCreated: number
}

export type Unlocks = Partial<Record<AchievementId, number>>
export type AchievementState = { progress: Progress; unlocks: Unlocks; badge?: AchievementId | null; updatedAt: number }

export const EMPTY_PROGRESS: Progress = {
  games: { pvp: 0, bot: 0, online: 0 },
  wins: { pvp: 0, bot: 0, online: 0 },
  botWinsByBand: { easy: 0, medium: 0, hard: 0 },
  botDraws: 0,
  promotions: 0,
  seriesPlayed: 0,
  seriesWon: 0,
  winStreak: 0,
  unbeatenStreak: 0,
  lossStreak: 0,
  rooms: [],
  opponents: {},
  days: 0,
  lastDay: null,
  diagonalWins: 0,
  centreWins: 0,
  lostAtTop: false,
  watched: false,
  roomsCreated: 0,
}
export const EMPTY_STATE: AchievementState = { progress: EMPTY_PROGRESS, unlocks: {}, updatedAt: 0 }

export const ACHIEVEMENTS_KEY = 'tic-tac-toe:achievements'
export const SHOW_HIDDEN_KEY = 'tic-tac-toe:show-hidden'

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const count = (v: unknown, fallback: number) => (isCount(v) ? v : fallback)
const counts = <K extends string>(v: unknown, fallback: Record<K, number>): Record<K, number> => {
  const out = { ...fallback }
  if (isObj(v)) for (const k of Object.keys(fallback) as K[]) out[k] = count(v[k], fallback[k])
  return out
}

function readProgress(v: unknown): Progress {
  if (!isObj(v)) return EMPTY_PROGRESS
  const e = EMPTY_PROGRESS
  const opponents: Record<string, number> = {}
  if (isObj(v.opponents)) for (const [k, n] of Object.entries(v.opponents)) if (isCount(n)) opponents[k] = n
  return {
    games: counts(v.games, e.games),
    wins: counts(v.wins, e.wins),
    botWinsByBand: counts(v.botWinsByBand, e.botWinsByBand),
    botDraws: count(v.botDraws, 0),
    promotions: count(v.promotions, 0),
    seriesPlayed: count(v.seriesPlayed, 0),
    seriesWon: count(v.seriesWon, 0),
    winStreak: count(v.winStreak, 0),
    unbeatenStreak: count(v.unbeatenStreak, 0),
    lossStreak: count(v.lossStreak, 0),
    rooms: Array.isArray(v.rooms) ? v.rooms.filter((r): r is string => typeof r === 'string') : [],
    opponents,
    days: count(v.days, 0),
    lastDay: typeof v.lastDay === 'string' ? v.lastDay : null,
    diagonalWins: count(v.diagonalWins, 0),
    centreWins: count(v.centreWins, 0),
    lostAtTop: v.lostAtTop === true,
    watched: v.watched === true,
    roomsCreated: count(v.roomsCreated, 0),
  }
}

export function readAchievementState(v: unknown): AchievementState {
  if (!isObj(v)) return EMPTY_STATE
  const unlocks: Unlocks = {}
  if (isObj(v.unlocks)) for (const [k, t] of Object.entries(v.unlocks)) if (isAchievementId(k) && typeof t === 'number' && Number.isFinite(t)) unlocks[k] = t
  const state: AchievementState = { progress: readProgress(v.progress), unlocks, updatedAt: typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? v.updatedAt : 0 }
  if (v.badge === null || isAchievementId(v.badge)) state.badge = v.badge
  return state
}

export function loadAchievements(storage: HistoryStorage): AchievementState {
  try {
    return readAchievementState(JSON.parse(storage.getItem(ACHIEVEMENTS_KEY) ?? 'null'))
  } catch {
    return EMPTY_STATE
  }
}

export function saveAchievements(storage: HistoryStorage, state: AchievementState): void {
  try {
    storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state))
  } catch {
    // Best-effort, like history.
  }
}
```

`Board` and `Player` are imported now for Task 2's event type; if the linter complains about unused imports, add them in Task 2 instead.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/achievements.ts src/lib/achievements.test.ts
git commit -m "feat(achievements): catalogue, state, load and save"
```

---

### Task 2: `record` for game events

**Files:**
- Modify: `src/lib/achievements.ts`
- Test: `src/lib/achievements.test.ts`

**Interfaces:**
- Produces: `AchievementEvent`, `GameEvent`, `record(state, event, now) → { state, unlocked }`.

- [ ] **Step 1: Write the failing tests**

```ts
import { EMPTY_STATE, record, type AchievementEvent, type AchievementState } from './achievements'
import type { Board } from './types'

const EMPTY: Board = [null, null, null, null, null, null, null, null, null]
const X_ROW: Board = ['X', 'X', 'X', 'O', 'O', null, null, null, null]
const X_DIAG: Board = ['X', 'O', null, 'O', 'X', null, null, null, 'X']
const X_MIDDLE_ROW: Board = ['O', null, 'O', 'X', 'X', 'X', null, null, null]
const NOON = Date.UTC(2026, 8, 26, 12)

const game = (over: Partial<Extract<AchievementEvent, { kind: 'game' }>> = {}): AchievementEvent => ({
  kind: 'game', mode: 'bot', result: 'win', board: X_ROW, symbol: 'X', finishedAt: NOON, band: 'easy', rungBefore: 1, rungAfter: 2, ...over,
})
const run = (events: AchievementEvent[], start: AchievementState = EMPTY_STATE) => {
  let state = start
  const all: string[] = []
  for (const e of events) {
    const r = record(state, e, 100)
    state = r.state
    all.push(...r.unlocked)
  }
  return { state, unlocked: all }
}

describe('record: firsts', () => {
  it('first games per mode and full circle', () => {
    expect(run([game({ mode: 'pvp' })]).unlocked).toContain('opening-move')
    expect(run([game()]).unlocked).toContain('hello-bot')
    expect(run([game({ mode: 'online', band: undefined, rungBefore: undefined, rungAfter: undefined })]).unlocked).toContain('going-live')
    const { unlocked } = run([game({ mode: 'pvp' }), game(), game({ mode: 'online' })])
    expect(unlocked).toContain('full-circle')
    expect(unlocked.filter((u) => u === 'hello-bot')).toHaveLength(1)
  })
  it('first bot win, per band, and a draw', () => {
    expect(run([game({ band: 'medium' })]).unlocked).toEqual(expect.arrayContaining(['beat-the-machine', 'middle-ground']))
    expect(run([game({ result: 'loss' })]).unlocked).not.toContain('beat-the-machine')
    expect(run([game({ result: 'draw' })]).unlocked).toContain('quick-draw')
  })
  it('stamps the unlock time and bumps updatedAt', () => {
    const { state } = run([game()])
    expect(state.unlocks['hello-bot']).toBe(100)
    expect(state.updatedAt).toBe(100)
  })
})

describe('record: ladder', () => {
  it('promotion, top, immovable, deep end, bounce back', () => {
    expect(run([game({ rungBefore: 10, rungAfter: 11 })]).unlocked).toContain('moving-up')
    expect(run([game({ rungBefore: 29, rungAfter: 30 })]).unlocked).toContain('top-of-the-pack')
    expect(run([game({ result: 'draw', rungBefore: 30, rungAfter: 30 })]).unlocked).toContain('the-immovable')
    expect(run([game({ rungBefore: 25, rungAfter: 26 })]).unlocked).toContain('deep-end')
    expect(run([game({ rungBefore: 24, rungAfter: 25 })]).unlocked).not.toContain('deep-end')
    const bounce = run([game({ result: 'loss', rungBefore: 30, rungAfter: 29 }), game({ rungBefore: 29, rungAfter: 30 })])
    expect(bounce.unlocked).toContain('bounce-back')
    const noBounce = run([game({ result: 'loss', rungBefore: 30, rungAfter: 29 }), game({ result: 'draw', rungBefore: 29, rungAfter: 29 }), game({ rungBefore: 29, rungAfter: 30 })])
    expect(noBounce.unlocked).not.toContain('bounce-back')
  })
})

describe('record: streaks and counts', () => {
  it('win streaks at 5 and 10, unbeaten at 5 and 10, losses at 5', () => {
    const wins = (n: number) => Array.from({ length: n }, () => game())
    expect(run(wins(4)).unlocked).not.toContain('high-five')
    expect(run(wins(5)).unlocked).toContain('high-five')
    expect(run(wins(10)).unlocked).toContain('perfect-ten')
    const drawsAndWins = [game(), game({ result: 'draw' }), game(), game({ result: 'draw' }), game()]
    expect(run(drawsAndWins).unlocked).toContain('unbroken')
    expect(run(drawsAndWins).unlocked).not.toContain('high-five')
    expect(run([...drawsAndWins, ...drawsAndWins]).unlocked).toContain('untouchable')
    expect(run(Array.from({ length: 5 }, () => game({ result: 'loss' }))).unlocked).toContain('rough-night')
  })
  it('a loss resets the win and unbeaten streaks; a draw resets win and loss streaks', () => {
    const { state } = run([game(), game(), game({ result: 'loss' })])
    expect(state.progress.winStreak).toBe(0)
    expect(state.progress.unbeatenStreak).toBe(0)
    expect(state.progress.lossStreak).toBe(1)
    const drawn = run([game({ result: 'loss' }), game({ result: 'draw' })]).state.progress
    expect(drawn.lossStreak).toBe(0)
    expect(drawn.unbeatenStreak).toBe(1)
  })
  it('two-player games leave every streak alone but count as games', () => {
    const { state } = run([game(), game(), game({ mode: 'pvp' })])
    expect(state.progress.winStreak).toBe(2)
    expect(state.progress.unbeatenStreak).toBe(2)
    expect(state.progress.games.pvp).toBe(1)
  })
  it('regular at 10 games any mode, century at 100 bot games, marathon at 500, fifty and two hundred wins', () => {
    const many = (n: number, over = {}) => Array.from({ length: n }, () => game(over))
    expect(run([...many(9, { mode: 'pvp' })]).unlocked).not.toContain('regular')
    expect(run([...many(10, { mode: 'pvp' })]).unlocked).toContain('regular')
    const hundred = run(many(100, { result: 'draw' }))
    expect(hundred.unlocked).toContain('century')
    expect(hundred.unlocked).toContain('stalemate')
    expect(run(many(500, { mode: 'pvp' })).unlocked).toContain('marathon')
    const fifty = run(many(50))
    expect(fifty.unlocked).toContain('fifty')
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: FAIL, `record` is not exported.

- [ ] **Step 3: Implement `record` for game events**

Append to `src/lib/achievements.ts`:

```ts
import { WIN_LINES } from './game'

export type GameEvent = {
  kind: 'game'
  mode: Mode
  result: 'win' | 'loss' | 'draw'
  board: Board
  /** The symbol this device (or Player 1) played. */
  symbol: Player
  finishedAt: number
  band?: Difficulty
  rungBefore?: number
  rungAfter?: number
  opponentId?: string
  opponentBadge?: AchievementId | null
}
export type SeriesEvent = {
  kind: 'series'
  won: boolean
  mine: number
  theirs: number
  trailedBy3: boolean
  tieBreak: boolean
  roomId: string
  opponentId: string
  opponentBadge: AchievementId | null
}
export type AchievementEvent = GameEvent | SeriesEvent | { kind: 'room-created' } | { kind: 'watched' }

export const TOP_RUNG = 30
const DEEP_END_RUNG = 25
const MAX_OPPONENTS = 50
const MAX_ROOMS = 10

const localDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const bandIndex = (rung: number) => Math.min(2, Math.floor((rung - 1) / 10))
const winningLine = (board: Board, symbol: Player) => WIN_LINES.find((line) => line.every((i) => board[i] === symbol)) ?? null

function applyGame(p: Progress, e: GameEvent): Progress {
  const next: Progress = { ...p, games: { ...p.games, [e.mode]: p.games[e.mode] + 1 }, wins: { ...p.wins } }
  if (e.result === 'win') next.wins[e.mode] += 1
  if (e.mode !== 'pvp') {
    next.winStreak = e.result === 'win' ? p.winStreak + 1 : 0
    next.unbeatenStreak = e.result === 'loss' ? 0 : p.unbeatenStreak + 1
    next.lossStreak = e.result === 'loss' ? p.lossStreak + 1 : 0
  }
  if (e.mode === 'bot') {
    if (e.result === 'draw') next.botDraws = p.botDraws + 1
    if (e.result === 'win' && e.band) next.botWinsByBand = { ...p.botWinsByBand, [e.band]: p.botWinsByBand[e.band] + 1 }
    if (e.rungBefore !== undefined && e.rungAfter !== undefined && bandIndex(e.rungAfter) > bandIndex(e.rungBefore)) next.promotions = p.promotions + 1
    next.lostAtTop = e.result === 'loss' && e.rungBefore === TOP_RUNG
  }
  if (e.result === 'win') {
    const line = winningLine(e.board, e.symbol)
    if (line) {
      if (line.includes(4)) next.centreWins = p.centreWins + 1
      if (line[0] !== 4 && line[1] === 4) next.diagonalWins = p.diagonalWins + 1
    }
  }
  const day = localDay(e.finishedAt)
  if (day !== p.lastDay) {
    next.days = p.days + 1
    next.lastDay = day
  }
  return next
}

type Rule = (p: Progress, e: AchievementEvent) => boolean
const onGame = (test: (e: GameEvent, p: Progress) => boolean): Rule => (p, e) => e.kind === 'game' && test(e, p)
const marksOf = (board: Board, symbol: Player) => board.filter((c) => c === symbol).length
const hour = (t: number) => new Date(t).getHours()

const RULES: Record<Exclude<AchievementId, 'grand-master'>, Rule> = {
  'opening-move': (p) => p.games.pvp >= 1,
  'hello-bot': (p) => p.games.bot >= 1,
  'beat-the-machine': (p) => p.wins.bot >= 1,
  'easy-does-it': (p) => p.botWinsByBand.easy >= 1,
  'middle-ground': (p) => p.botWinsByBand.medium >= 1,
  'hard-feelings': (p) => p.botWinsByBand.hard >= 1,
  'moving-up': (p) => p.promotions >= 1,
  'going-live': (p) => p.games.online >= 1,
  'front-row': (p) => p.watched,
  landlord: (p) => p.roomsCreated >= 1,
  'quick-draw': (p) => p.botDraws >= 1,
  regular: (p) => p.games.pvp + p.games.bot + p.games.online >= 10,
  'night-owl': onGame((e) => hour(e.finishedAt) < 4),
  'rough-night': (p) => p.lossStreak >= 5,
  'early-bird': onGame((e) => hour(e.finishedAt) >= 5 && hour(e.finishedAt) < 7),
  'full-circle': (p) => p.games.pvp >= 1 && p.games.bot >= 1 && p.games.online >= 1,
  closer: (p) => p.seriesWon >= 1,
  'high-five': (p) => p.winStreak >= 5,
  unbroken: (p) => p.unbeatenStreak >= 5,
  century: (p) => p.games.bot >= 100,
  'comeback-kid': (_p, e) => e.kind === 'series' && e.won && e.trailedBy3,
  'bounce-back': (_p, e) => e.kind === 'game' && e.mode === 'bot' && e.result === 'win' && e.lostAtTopBefore === true,
  'frequent-flyer': (p) => p.rooms.length >= 3,
  fifty: (p) => p.wins.bot + p.wins.online >= 50,
  'fast-hands': onGame((e) => e.result === 'win' && marksOf(e.board, e.symbol) === 3),
  'sly-diagonal': (p) => p.diagonalWins >= 10,
  'centre-stage': (p) => p.centreWins >= 10,
  stalemate: (p) => p.botDraws >= 10,
  'old-rivals': (p) => Object.values(p.opponents).some((n) => n >= 3),
  'week-warrior': (p) => p.days >= 7,
  'perfect-ten': (p) => p.winStreak >= 10,
  untouchable: (p) => p.unbeatenStreak >= 10,
  'clean-sweep': (_p, e) => e.kind === 'series' && e.won && e.mine === 6 && e.theirs === 0,
  'top-of-the-pack': onGame((e) => e.mode === 'bot' && e.rungAfter === TOP_RUNG && (e.rungBefore ?? TOP_RUNG) < TOP_RUNG),
  'the-immovable': onGame((e) => e.mode === 'bot' && e.result === 'draw' && e.rungBefore === TOP_RUNG),
  marathon: (p) => p.games.pvp + p.games.bot + p.games.online >= 500,
  tiebreaker: (_p, e) => e.kind === 'series' && e.won && e.tieBreak,
  'two-hundred': (p) => p.wins.bot + p.wins.online >= 200,
  'giant-killer': (_p, e) => e.kind === 'series' && e.won && e.opponentBadge === 'the-immovable',
  'deep-end': onGame((e) => e.mode === 'bot' && e.result === 'win' && (e.rungBefore ?? 0) >= DEEP_END_RUNG),
}
```

Bounce Back needs the flag from *before* the event, so `record` passes an enriched event. Implement `record` as:

```ts
export function record(state: AchievementState, event: AchievementEvent, now: number): { state: AchievementState; unlocked: AchievementId[] } {
  const before = state.progress
  const progress = applyEvent(before, event)
  const seen: AchievementEvent = event.kind === 'game' ? { ...event, lostAtTopBefore: before.lostAtTop } : event
  const unlocks: Unlocks = { ...state.unlocks }
  const unlocked: AchievementId[] = []
  for (const a of ACHIEVEMENTS) {
    if (a.id === 'grand-master' || unlocks[a.id] !== undefined) continue
    if (RULES[a.id](progress, seen)) {
      unlocks[a.id] = now
      unlocked.push(a.id)
    }
  }
  if (unlocks['grand-master'] === undefined && ACHIEVEMENTS.every((a) => a.id === 'grand-master' || unlocks[a.id] !== undefined)) {
    unlocks['grand-master'] = now
    unlocked.push('grand-master')
  }
  return { state: { ...state, progress, unlocks, updatedAt: now }, unlocked }
}

function applyEvent(p: Progress, e: AchievementEvent): Progress {
  switch (e.kind) {
    case 'game':
      return applyGame(p, e)
    case 'room-created':
      return { ...p, roomsCreated: p.roomsCreated + 1 }
    case 'watched':
      return { ...p, watched: true }
    case 'series':
      return applySeries(p, e)
  }
}
```

Add `lostAtTopBefore?: boolean` to `GameEvent` (internal, documented as "set by record"). `applySeries` comes in Task 3; for this task stub it as `return p` so the file compiles, and leave the series rules in place (they cannot fire without a series event).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/achievements.ts src/lib/achievements.test.ts
git commit -m "feat(achievements): record game events"
```

---

### Task 3: Series, room, watched events, Grand Master, badge, merge

**Files:**
- Modify: `src/lib/achievements.ts`
- Test: `src/lib/achievements.test.ts`

**Interfaces:**
- Produces: `defaultBadge(unlocks)`, `wornBadge(state)`, `merge(local, cloud) → { state, localChanged, cloudBehind }`.

- [ ] **Step 1: Write the failing tests**

```ts
const series = (over: Partial<SeriesEvent> = {}): AchievementEvent => ({
  kind: 'series', won: true, mine: 6, theirs: 2, trailedBy3: false, tieBreak: false, roomId: 'r1', opponentId: 'o1', opponentBadge: null, ...over,
})

describe('record: series, rooms, watching', () => {
  it('closer, clean sweep, comeback, tiebreaker, giant killer', () => {
    expect(run([series()]).unlocked).toContain('closer')
    expect(run([series({ won: false })]).unlocked).not.toContain('closer')
    expect(run([series({ theirs: 0 })]).unlocked).toContain('clean-sweep')
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
  })
  it('identical copies change nothing', () => {
    expect(merge(local, { ...local })).toEqual({ state: local, localChanged: false, cloudBehind: false })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: FAIL on the series unlocks and the missing exports.

- [ ] **Step 3: Implement**

```ts
function applySeries(p: Progress, e: SeriesEvent): Progress {
  const rooms = p.rooms.includes(e.roomId) ? p.rooms : [...p.rooms, e.roomId].slice(-MAX_ROOMS)
  const opponents = { ...p.opponents, [e.opponentId]: (p.opponents[e.opponentId] ?? 0) + 1 }
  const keys = Object.keys(opponents)
  if (keys.length > MAX_OPPONENTS) delete opponents[keys[0]]
  return { ...p, seriesPlayed: p.seriesPlayed + 1, seriesWon: p.seriesWon + (e.won ? 1 : 0), rooms, opponents }
}

export function defaultBadge(unlocks: Unlocks): AchievementId | null {
  let best: AchievementId | null = null
  for (const a of ACHIEVEMENTS) {
    const at = unlocks[a.id]
    if (at === undefined) continue
    if (best === null) best = a.id
    else {
      const b = achievementById(best)
      const rank = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
      if (rank > 0 || (rank === 0 && at > (unlocks[best] as number))) best = a.id
    }
  }
  return best
}

export function wornBadge(state: AchievementState): AchievementId | null {
  if (state.badge === null) return null
  if (state.badge !== undefined && state.unlocks[state.badge] !== undefined) return state.badge
  return defaultBadge(state.unlocks)
}

export function merge(local: AchievementState, cloud: AchievementState | null): { state: AchievementState; localChanged: boolean; cloudBehind: boolean } {
  if (!cloud) return { state: local, localChanged: false, cloudBehind: local.updatedAt > 0 || Object.keys(local.unlocks).length > 0 }
  const unlocks: Unlocks = { ...cloud.unlocks }
  for (const [id, at] of Object.entries(local.unlocks) as [AchievementId, number][]) {
    const c = unlocks[id]
    if (c === undefined || at < c) unlocks[id] = at
  }
  const newer = cloud.updatedAt > local.updatedAt ? cloud : local
  const state: AchievementState = { progress: newer.progress, unlocks, updatedAt: Math.max(local.updatedAt, cloud.updatedAt) }
  if (newer.badge !== undefined) state.badge = newer.badge
  const same = (a: AchievementState, b: AchievementState) => JSON.stringify(a) === JSON.stringify(b)
  return { state, localChanged: !same(state, local), cloudBehind: !same(state, cloud) }
}
```

Note: `JSON.stringify` key order matters for `same`; build `state` with the same key order as the stored shape (`progress`, `unlocks`, `badge`, `updatedAt`). If the identical-copies test still fails on order, compare with a small deep-equal instead of stringify.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/achievements.ts src/lib/achievements.test.ts
git commit -m "feat(achievements): series events, grand master, badge, merge"
```

---

### Task 4: Wiped-device detection

**Files:**
- Create: `src/lib/reset.ts`
- Test: `src/lib/reset.test.ts`

**Interfaces:**
- Produces: `REGISTERED_KEY`, `WIPE_KEYS`, `markRegistered(storage)`, `isRegistered(storage)`, `shouldWipe(registered, player)`, `wipeLocal(storage)`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { REGISTERED_KEY, WIPE_KEYS, isRegistered, markRegistered, shouldWipe, wipeLocal } from './reset'
import type { HistoryStorage } from './history'

const memory = (): HistoryStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

describe('reset', () => {
  it('wipes only when the device registered before and the cloud row is gone', () => {
    expect(shouldWipe(true, null)).toBe(true)
    expect(shouldWipe(true, { id: 'd', nickname: 'n' })).toBe(false)
    expect(shouldWipe(false, null)).toBe(false)
  })
  it('remembers registration', () => {
    const s = memory()
    expect(isRegistered(s)).toBe(false)
    markRegistered(s)
    expect(isRegistered(s)).toBe(true)
    expect(s.data.get(REGISTERED_KEY)).toBe('1')
  })
  it('wipeLocal removes exactly the game data keys and leaves identity alone', () => {
    const s = memory()
    for (const k of WIPE_KEYS) s.setItem(k, 'x')
    s.setItem('tic-tac-toe:device', 'keep')
    s.setItem('tic-tac-toe:player-token', 'keep')
    wipeLocal(s)
    for (const k of WIPE_KEYS) expect(s.getItem(k)).toBeNull()
    expect(s.getItem('tic-tac-toe:device')).toBe('keep')
    expect(s.getItem('tic-tac-toe:player-token')).toBe('keep')
    expect(WIPE_KEYS).toEqual(expect.arrayContaining(['tic-tac-toe:history', 'tic-tac-toe:ladder', 'tic-tac-toe:achievements', 'tic-tac-toe:setup', 'tic-tac-toe:nickname', 'tic-tac-toe:rooms-owned', 'tic-tac-toe:show-hidden', 'tic-tac-toe:registered']))
  })
})
```

Check the real setup key with `grep -n SETUP_KEY src/lib/setup.ts` and use that value.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/reset.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { ACHIEVEMENTS_KEY, SHOW_HIDDEN_KEY } from './achievements'
import { STORAGE_KEY as HISTORY_KEY, type HistoryStorage } from './history'
import { NICKNAME_KEY, OWNED_KEY } from './identity'
import { LADDER_KEY } from './ladder'
import { SETUP_KEY } from './setup'
import type { PlayerRecord } from './roomDirectory'

/** Set once this device's player row has been written; a missing row after that means the cloud was wiped. */
export const REGISTERED_KEY = 'tic-tac-toe:registered'

/** Everything that is game data. Device id, player token, and developer mode are not. */
export const WIPE_KEYS = [HISTORY_KEY, LADDER_KEY, ACHIEVEMENTS_KEY, SETUP_KEY, NICKNAME_KEY, OWNED_KEY, SHOW_HIDDEN_KEY, REGISTERED_KEY]

export const isRegistered = (storage: HistoryStorage): boolean => storage.getItem(REGISTERED_KEY) === '1'
export function markRegistered(storage: HistoryStorage): void {
  try {
    storage.setItem(REGISTERED_KEY, '1')
  } catch {
    // Best-effort.
  }
}

export const shouldWipe = (registered: boolean, player: PlayerRecord | null): boolean => registered && player === null

export function wipeLocal(storage: HistoryStorage): void {
  for (const key of WIPE_KEYS) {
    try {
      storage.removeItem(key)
    } catch {
      // Best-effort.
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/reset.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reset.ts src/lib/reset.test.ts
git commit -m "feat(reset): wiped-device detection and local wipe"
```

---

### Task 5: The `achievement` feedback event

**Files:**
- Modify: `src/lib/feedback.ts`, `src/platform/browserFeedback.ts`
- Test: `src/platform/browserFeedback.test.ts`

- [ ] **Step 1: Write the failing test**

Look at how existing tests in `src/platform/browserFeedback.test.ts` build a fake audio and count notes, then add:

```ts
it('plays a rising two-note chime and a light buzz for an achievement', () => {
  const { feedback, notes, vibrate } = harness() // reuse the file's helper; adapt the name
  feedback.play({ kind: 'achievement' })
  expect(notes.map((n) => n.hz)).toEqual([784, 1175])
  expect(vibrate).toHaveBeenCalledWith([20, 40, 40])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/platform/browserFeedback.test.ts`
Expected: FAIL, type error on `kind: 'achievement'` and no notes.

- [ ] **Step 3: Implement**

In `feedback.ts` add `| { kind: 'achievement' }` to `FeedbackEvent`. In `browserFeedback.ts` add to `notesFor`:

```ts
case 'achievement':
  return [784, 1175].map((hz, i) => ({ hz, at: i * 0.1, length: 0.18 }))
```

and to `vibrationFor`: `case 'achievement': return [20, 40, 40]`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/platform/browserFeedback.test.ts src/lib/feedback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/feedback.ts src/platform/browserFeedback.ts src/platform/browserFeedback.test.ts
git commit -m "feat(feedback): achievement chime"
```

---

### Task 6: Badge on presence and series shapes

**Files:**
- Modify: `src/lib/room.ts`
- Test: `src/lib/room.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
describe('badge on shapes', () => {
  const presence = { deviceId: 'd', nickname: 'n', status: 'idle', gameId: null }
  it('accepts a missing or string badge on presence and rejects other types', () => {
    expect(isRoomPresence(presence)).toBe(true)
    expect(isRoomPresence({ ...presence, badge: 'the-immovable' })).toBe(true)
    expect(isRoomPresence({ ...presence, badge: 123 })).toBe(false)
  })
  it('accepts a badge on series players in results and challenges', () => {
    const player = { deviceId: 'a', nickname: 'A', badge: 'closer' }
    expect(isRoomEvent({ type: 'challenge', gameId: 'g', from: player, to: 'b' })).toBe(true)
    expect(isRoomEvent({ type: 'challenge', gameId: 'g', from: { ...player, badge: 5 }, to: 'b' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/room.test.ts`
Expected: FAIL on the `badge: 123` cases.

- [ ] **Step 3: Implement**

```ts
export type SeriesPlayer = { deviceId: string; nickname: string; badge?: string }
export type RoomPresence = { deviceId: string; nickname: string; status: MemberStatus; gameId: string | null; badge?: string }
const hasBadge = (v: Record<string, unknown>) => v.badge === undefined || isString(v.badge)
const isPlayerRef = (v: unknown): v is SeriesPlayer => isObject(v) && isString(v.deviceId) && isString(v.nickname) && hasBadge(v)
```

and add `&& hasBadge(v)` to `isRoomPresence`. Update `src/state/series.ts`'s own `isPlayerRef` the same way. Update `supabaseDirectory.ts` `ResultRow` mapping: add `winner_badge` / `loser_badge` columns? No: the spec says results rows gain nothing; drop the badge when writing results (`rowFromResult` ignores it) and it is simply absent on rows read back. History and room results therefore show badges only for series still in memory. Keep that behaviour and note it in the spec's out-of-scope line (already there: "badges beside names in History for two-player and bot rows"; extend it to "results read back from the cloud").

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/room.test.ts src/state/series.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/room.ts src/state/series.ts src/lib/room.test.ts docs/superpowers/specs/2026-09-26-achievements-design.md
git commit -m "feat(room): optional badge on presence and series players"
```

---

### Task 7: Directory: player lookup, achievements row, SQL

**Files:**
- Modify: `src/lib/roomDirectory.ts`, `src/platform/supabaseDirectory.ts`, `supabase/schema.sql`
- Create: `supabase/migrations/2026-09-26-achievements.sql`
- Test: `src/lib/roomDirectory.test.ts`, `src/platform/supabaseDirectory.test.ts`

**Interfaces:**
- Produces on `RoomDirectory`: `loadPlayer(playerId): Promise<PlayerRecord | null>`, `loadAchievements(playerId): Promise<AchievementState | null>`, `saveAchievements(playerId, token, state): Promise<void>`; `resetPlayerData` also removes the achievements row.

- [ ] **Step 1: Write the failing tests (fake directory)**

```ts
it('loads a player by id, or null', async () => {
  const dir = createFakeDirectory(hash)
  expect(await dir.loadPlayer('d1')).toBeNull()
  await dir.savePlayer({ id: 'd1', nickname: 'Ann' }, 't1')
  expect(await dir.loadPlayer('d1')).toEqual({ id: 'd1', nickname: 'Ann' })
})
it('stores achievements per player behind the token, newest updatedAt wins, and reset removes them', async () => {
  const dir = createFakeDirectory(hash)
  const state = { ...EMPTY_STATE, unlocks: { 'hello-bot': 1 }, updatedAt: 5 }
  expect(await dir.loadAchievements('d1')).toBeNull()
  await dir.saveAchievements('d1', 't1', state)
  expect(await dir.loadAchievements('d1')).toEqual(state)
  await expect(dir.saveAchievements('d1', 'wrong', { ...state, updatedAt: 9 })).rejects.toThrow()
  await dir.saveAchievements('d1', 't1', { ...state, updatedAt: 3 })
  expect((await dir.loadAchievements('d1'))?.updatedAt).toBe(5)
  expect(await dir.resetPlayerData('d1', 't1')).toBe(true)
  expect(await dir.loadAchievements('d1')).toBeNull()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/roomDirectory.test.ts`
Expected: FAIL, functions missing.

- [ ] **Step 3: Implement the interface and fake**

In `roomDirectory.ts`:

```ts
import type { AchievementState } from './achievements'
// on RoomDirectory:
  /** This device's player row, or null when it has none (never registered, or the cloud was wiped). */
  loadPlayer(playerId: string): Promise<PlayerRecord | null>
  loadAchievements(playerId: string): Promise<AchievementState | null>
  /** Insert or update; the token must match; an older updatedAt is ignored. */
  saveAchievements(playerId: string, token: string, state: AchievementState): Promise<void>
```

Fake: a `Map<string, { state: AchievementState; tokenHash: string }>`; `saveAchievements` throws on a token mismatch and ignores an older `updatedAt`; `resetPlayerData` also checks the achievements row's token and deletes it, counting it in `removed`. `loadPlayer` returns `{ id, nickname }` or null.

- [ ] **Step 4: Supabase adapter test**

In `src/platform/supabaseDirectory.test.ts`, following the file's fake client pattern, add:

```ts
it('saves achievements through save_achievements with ISO updated_at and loads them back', async () => {
  // rpc spy: expect fn 'save_achievements' with p_id, p_token, p_unlocks, p_progress, p_badge, p_updated_at ISO
  // from('achievements').select('*').eq('player_id', id).maybeSingle() returning a row → AchievementState via readAchievementState
})
it('loads a player from players by id', async () => {
  // from('players').select('*').eq('id', id).maybeSingle()
})
```

Add `'achievements' | 'players'` to `DirectoryClientLike.from`, an rpc overload for `save_achievements`, and rows:

```ts
type AchievementsRow = { player_id: string; unlocks: unknown; progress: unknown; badge: string | null; updated_at: string }
async loadAchievements(playerId) {
  const row = await unwrap<AchievementsRow | null>(client.from('achievements').select('*').eq('player_id', playerId).maybeSingle())
  return row ? readAchievementState({ unlocks: row.unlocks, progress: row.progress, badge: row.badge, updatedAt: Date.parse(row.updated_at) }) : null
},
async saveAchievements(playerId, token, state) {
  const { error } = await client.rpc('save_achievements', {
    p_id: playerId, p_token: token, p_unlocks: state.unlocks, p_progress: state.progress,
    p_badge: state.badge === undefined ? null : state.badge, p_updated_at: new Date(state.updatedAt).toISOString(),
  })
  if (error) throw new Error(error.message)
},
async loadPlayer(playerId) {
  const row = await unwrap<{ id: string; nickname: string } | null>(client.from('players').select('*').eq('id', playerId).maybeSingle())
  return row ? { id: row.id, nickname: row.nickname } : null
},
```

Note the cloud row cannot tell "badge never chosen" from "chose None"; the adapter stores `null` for both, and `readAchievementState` sets `badge: null` when the column is null. To preserve "never chosen", store the string `'default'` when `state.badge === undefined` and map it back to `undefined` on load. Do that: `p_badge: state.badge === undefined ? 'default' : state.badge`, and on load pass `badge: row.badge === 'default' ? undefined : row.badge`.

- [ ] **Step 5: SQL**

`supabase/migrations/2026-09-26-achievements.sql`:

```sql
-- Achievements: one row per device, written only through save_achievements with the device's token.
create table if not exists public.achievements (
  player_id text primary key,
  token_hash text not null,
  unlocks jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  badge text,
  updated_at timestamptz not null default now()
);
alter table public.achievements enable row level security;
drop policy if exists "achievements are public" on public.achievements;
create policy "achievements are public" on public.achievements for select to anon, authenticated using (true);

create or replace function public.save_achievements(
  p_id text, p_token text, p_unlocks jsonb, p_progress jsonb, p_badge text, p_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text := encode(extensions.digest(p_token, 'sha256'), 'hex');
begin
  insert into public.achievements (player_id, token_hash, unlocks, progress, badge, updated_at)
  values (p_id, hashed, p_unlocks, p_progress, p_badge, p_updated_at)
  on conflict (player_id) do update
    set unlocks = excluded.unlocks,
        progress = excluded.progress,
        badge = excluded.badge,
        updated_at = excluded.updated_at
    where public.achievements.token_hash = excluded.token_hash
      and excluded.updated_at >= public.achievements.updated_at;
end
$$;
grant execute on function public.save_achievements(text, text, jsonb, jsonb, text, timestamptz) to anon, authenticated;

-- reset_player_data now also removes the achievements row.
create or replace function public.reset_player_data(p_id text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  hashed text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  owner text;
  removed int := 0;
  n int;
begin
  select token_hash into owner from public.ladders where player_id = p_id;
  if owner is null then select token_hash into owner from public.achievements where player_id = p_id; end if;
  if owner is null then select token_hash into owner from public.players where id = p_id; end if;
  if owner is null or owner <> hashed then return false; end if;
  delete from public.games where player_id = p_id; get diagnostics n = row_count; removed := removed + n;
  delete from public.ladders where player_id = p_id; get diagnostics n = row_count; removed := removed + n;
  delete from public.achievements where player_id = p_id; get diagnostics n = row_count; removed := removed + n;
  return removed > 0;
end
$$;
grant execute on function public.reset_player_data(text, text) to anon, authenticated;

-- Full reset, by hand only, never part of a migration run:
-- truncate public.rooms, public.results, public.players, public.games, public.ladders, public.achievements;
```

Copy the table, `save_achievements`, and the new `reset_player_data` body into `schema.sql` (replace the old function there).

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run src/lib/roomDirectory.test.ts src/platform/supabaseDirectory.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/roomDirectory.ts src/platform/supabaseDirectory.ts src/lib/roomDirectory.test.ts src/platform/supabaseDirectory.test.ts supabase
git commit -m "feat(directory): player lookup and achievements row"
```

---

### Task 8: `AchievementBadge` and `AchievementToast`

**Files:**
- Create: `src/components/AchievementBadge.tsx`, `src/components/AchievementToast.tsx`
- Test: `src/components/AchievementToast.test.tsx`

**Interfaces:**
- `AchievementBadge({ id, size? })`: renders nothing for an unknown or null id; otherwise the lucide icon in the tier colour with `aria-label` = name and `data-badge={id}`.
- `AchievementIcon({ id, className })`: the icon alone (used by the sheet and picker).
- `AchievementToast({ queue, onDone, feedback })`: shows `queue[0]`; calls `onDone()` after 3 s or on tap; plays `{ kind: 'achievement' }` once per id.

- [ ] **Step 1: Write the failing test**

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AchievementToast, TOAST_MS } from './AchievementToast'

describe('AchievementToast', () => {
  it('shows the head of the queue, plays the chime once, and moves on after the delay or a tap', () => {
    vi.useFakeTimers()
    const play = vi.fn()
    const onDone = vi.fn()
    const { rerender } = render(<AchievementToast queue={['hello-bot', 'closer']} onDone={onDone} feedback={{ play }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Hello, Bot')
    expect(screen.getByRole('status')).toHaveTextContent('Achievement unlocked')
    expect(play).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(TOAST_MS))
    expect(onDone).toHaveBeenCalledTimes(1)
    rerender(<AchievementToast queue={['closer']} onDone={onDone} feedback={{ play }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Closer')
    fireEvent.click(screen.getByRole('status'))
    expect(onDone).toHaveBeenCalledTimes(2)
    rerender(<AchievementToast queue={[]} onDone={onDone} feedback={{ play }} />)
    expect(screen.queryByRole('status')).toBeNull()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/AchievementToast.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`AchievementBadge.tsx`:

```tsx
import * as icons from 'lucide-react'
import { TIER_COLOR, achievementById, isAchievementId } from '@/lib/achievements'
import { cn } from '@/lib/utils'

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-hidden'?: boolean }>

export function AchievementIcon({ id, className, dimmed = false }: { id: string; className?: string; dimmed?: boolean }) {
  if (!isAchievementId(id)) return null
  const a = achievementById(id)
  const Icon = ((icons as unknown as Record<string, IconComponent>)[a.icon] ?? icons.Award) as IconComponent
  return <Icon aria-hidden className={cn('shrink-0', className)} style={{ color: dimmed ? undefined : TIER_COLOR[a.tier] }} />
}

/** One unlocked achievement worn above a name online. Nothing for a missing or unknown id. */
export function AchievementBadge({ id, className }: { id?: string | null; className?: string }) {
  if (!id || !isAchievementId(id)) return null
  return (
    <span role="img" aria-label={achievementById(id).name} data-badge={id} className={cn('inline-flex', className)}>
      <AchievementIcon id={id} className="size-4" />
    </span>
  )
}
```

`AchievementToast.tsx`:

```tsx
import { useEffect } from 'react'
import { AchievementIcon } from './AchievementBadge'
import { achievementById, type AchievementId } from '@/lib/achievements'
import type { Feedback } from '@/lib/feedback'

export const TOAST_MS = 3000

/** One unlock at a time at the top of the screen; the queue's head is shown and popped by onDone. */
export function AchievementToast({ queue, onDone, feedback }: { queue: AchievementId[]; onDone: () => void; feedback: Feedback }) {
  const id = queue[0]
  useEffect(() => {
    if (!id) return
    feedback.play({ kind: 'achievement' })
    const t = setTimeout(onDone, TOAST_MS)
    return () => clearTimeout(t)
  }, [id, feedback, onDone])
  if (!id) return null
  const a = achievementById(id)
  return (
    <div
      key={id}
      role="status"
      onClick={onDone}
      className="toast-in fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-[388px] cursor-pointer items-center gap-3 rounded-[18px] border border-border bg-card px-4 py-3 shadow-lg"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <AchievementIcon id={id} className="size-7" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Achievement unlocked</span>
        <span className="truncate font-heading text-[15px] font-semibold">{a.name}</span>
      </span>
    </div>
  )
}
```

Add to `src/index.css` next to `rise-in`: a `toast-in` keyframe sliding from `translateY(-120%)` to `0` over 250 ms with `prefers-reduced-motion: reduce` collapsing it to a fade. Check `grep -n "rise-in" src/index.css` for the pattern.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/AchievementToast.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AchievementBadge.tsx src/components/AchievementToast.tsx src/components/AchievementToast.test.tsx src/index.css
git commit -m "feat(achievements): badge icon and unlock toast"
```

---

### Task 9: `AchievementsSheet` and the setup trophy button

**Files:**
- Create: `src/components/AchievementsSheet.tsx`
- Modify: `src/components/SetupScreen.tsx`
- Test: `src/components/AchievementsSheet.test.tsx`, `src/components/SetupScreen.test.tsx`

**Interfaces:**
- `AchievementsSheet({ open, onOpenChange, state, storage })`. `SetupScreen` gains `onOpenAchievements: () => void`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('AchievementsSheet', () => {
  const memory = () => { const d = new Map<string, string>(); return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v), removeItem: (k: string) => void d.delete(k) } }
  const state = { ...EMPTY_STATE, unlocks: { 'hello-bot': Date.UTC(2026, 8, 20), 'the-immovable': 1 } }
  it('counts, shows unlocked tiles with a date, hides hidden ones, and reveals them with the switch', () => {
    const storage = memory()
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} storage={storage} />)
    expect(screen.getByText('2 of 41 unlocked')).toBeInTheDocument()
    expect(screen.getByText('Hello, Bot')).toBeInTheDocument()
    expect(screen.getByText('The Immovable')).toBeInTheDocument() // unlocked hidden ones show
    expect(screen.queryByText('Night Owl')).toBeNull()
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('switch', { name: 'Show hidden' }))
    expect(screen.getByText('Night Owl')).toBeInTheDocument()
    expect(storage.getItem(SHOW_HIDDEN_KEY)).toBe('1')
  })
})
// SetupScreen.test.tsx
it('has an Achievements button that opens the sheet', () => {
  const onOpenAchievements = vi.fn()
  render(<SetupScreen {...baseProps} onOpenAchievements={onOpenAchievements} />)
  fireEvent.click(screen.getByRole('button', { name: 'Achievements' }))
  expect(onOpenAchievements).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/AchievementsSheet.test.tsx src/components/SetupScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the sheet**

Structure, using the same `Sheet` / `ScrollArea` / `SheetClose` skeleton as `HistorySheet` (85dvh, `initialFocus` keyboard-only):

- Header: title "Achievements", description `${n} of ${ACHIEVEMENTS.length} unlocked`.
- A row of four tier chips: `<span style={{ color: TIER_COLOR[tier] }}>{unlockedInTier}/{totalInTier}</span>` with the tier name.
- The Show hidden switch: same markup as the Aggressive bot switch in `SettingsSheet` (`role="switch"`, `aria-labelledby`), state from `storage.getItem(SHOW_HIDDEN_KEY) === '1'`, written on toggle.
- Grid `grid grid-cols-2 gap-3`; tiles sorted by `TIER_ORDER.indexOf(tier)` then catalogue index. Tile:

```tsx
function Tile({ a, at, reveal }: { a: Achievement; at?: number; reveal: boolean }) {
  const unlocked = at !== undefined
  const secret = !unlocked && a.hidden && !reveal
  return (
    <li data-testid="achievement" data-unlocked={unlocked} className={cn('flex flex-col gap-1.5 rounded-[18px] bg-muted/70 px-3.5 py-3 dark:bg-muted/50', !unlocked && 'opacity-70')}>
      <span className="flex items-center justify-between">
        {secret ? <span className="text-xl text-muted-foreground" aria-hidden>?</span> : <AchievementIcon id={a.id} className="size-6" dimmed={!unlocked} />}
        <span aria-label={a.tier} className="size-2.5 rounded-full" style={{ background: TIER_COLOR[a.tier] }} />
      </span>
      <span className="font-heading text-[14px] font-semibold">{secret ? 'Hidden' : a.name}</span>
      <span className="text-[12px] text-muted-foreground">{secret ? 'Unlock it to find out' : a.description}</span>
      {unlocked && <span className="text-[11px] text-muted-foreground">{dayFormat.format(at)}</span>}
      {!unlocked && a.hidden && reveal && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Hidden</span>}
    </li>
  )
}
```

Setup: add a `Button variant="outline" size="lg"` labelled "Achievements" directly under History, calling `onOpenAchievements`. Keep the History button's knock hook untouched.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/AchievementsSheet.test.tsx src/components/SetupScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AchievementsSheet.tsx src/components/AchievementsSheet.test.tsx src/components/SetupScreen.tsx src/components/SetupScreen.test.tsx
git commit -m "feat(achievements): the sheet and the setup button"
```

---

### Task 10: Badge picker in Settings

**Files:**
- Modify: `src/components/SettingsSheet.tsx`
- Test: `src/components/SettingsSheet.test.tsx`

**Interfaces:**
- `SettingsSheet` gains `badge: { unlocks: Unlocks; worn: AchievementId | null; onChange: (badge: AchievementId | null) => void }`.

- [ ] **Step 1: Write the failing test**

```tsx
it('lets the player pick a badge from the unlocked ones or none', () => {
  const onChange = vi.fn()
  render(<SettingsSheet {...base} badge={{ unlocks: { 'hello-bot': 1, closer: 2 }, worn: 'closer', onChange }} />)
  const group = screen.getByRole('radiogroup', { name: 'Badge' })
  expect(within(group).getByRole('radio', { name: 'Closer' })).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(within(group).getByRole('radio', { name: 'Hello, Bot' }))
  expect(onChange).toHaveBeenCalledWith('hello-bot')
  fireEvent.click(within(group).getByRole('radio', { name: 'None' }))
  expect(onChange).toHaveBeenCalledWith(null)
})
it('says how to earn a badge when nothing is unlocked', () => {
  render(<SettingsSheet {...base} badge={{ unlocks: {}, worn: null, onChange: vi.fn() }} />)
  expect(screen.getByText('Unlock an achievement to wear a badge')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/SettingsSheet.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Between the Aggressive bot switch and the Developer section:

```tsx
<div className="flex flex-col gap-2">
  <span id="settings-badge" className="font-heading text-[15px] font-medium">Badge</span>
  <span className="text-sm text-muted-foreground">Shown above your name online.</span>
  {unlockedIds.length === 0 ? (
    <p className="text-sm text-muted-foreground">Unlock an achievement to wear a badge</p>
  ) : (
    <div role="radiogroup" aria-labelledby="settings-badge" className="flex gap-2 overflow-x-auto pb-1">
      <button type="button" role="radio" aria-checked={badge.worn === null} aria-label="None" onClick={() => badge.onChange(null)} className={tile(badge.worn === null)}>—</button>
      {unlockedIds.map((id) => (
        <button key={id} type="button" role="radio" aria-checked={badge.worn === id} aria-label={achievementById(id).name} onClick={() => badge.onChange(id)} className={tile(badge.worn === id)}>
          <AchievementIcon id={id} className="size-6" />
        </button>
      ))}
    </div>
  )}
</div>
```

`unlockedIds` = catalogue order filtered by `unlocks[id] !== undefined`; `tile(on)` = `cn('flex size-12 shrink-0 items-center justify-center rounded-[14px] border', on ? 'border-player-o bg-player-o-soft' : 'border-input')`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/SettingsSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsSheet.tsx src/components/SettingsSheet.test.tsx
git commit -m "feat(settings): badge picker"
```

---

### Task 11: GameScreen emits events, fanfare removed

**Files:**
- Modify: `src/components/GameScreen.tsx`, `src/components/GameScreen.test.tsx`, `src/components/HistorySheet.tsx`, `src/components/HistorySheet.test.tsx`
- Delete: `src/components/TopCard.tsx`, `src/components/TopCard.test.tsx` (if present)

**Interfaces:**
- `GameScreen` gains `onAchievement?: (event: GameEvent) => void`; loses `share`, `siteUrl`. `HistorySheet` loses `share`, `siteUrl`.

- [ ] **Step 1: Write the failing tests**

In `GameScreen.test.tsx`, following the file's helpers for playing a game to a result:

```tsx
it('reports a finished bot game with the ladder before and after, and a two-player game without', async () => {
  const onAchievement = vi.fn()
  // play a bot game at rung 1 that Player 1 wins (existing helper)
  expect(onAchievement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'game', mode: 'bot', result: 'win', band: 'easy', rungBefore: 1, rungAfter: 2, symbol: 'X' }))
  // then a pvp game
  expect(onAchievement).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'game', mode: 'pvp', rungBefore: undefined }))
})
it('reports nothing for a voided game', ...)
it('no longer shows the promotion note or the top card', ...) // convert the old moment tests: assert the texts are absent
```

Delete the old tests that assert "Promoted to", "Top of the pack", the card, and Share.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/GameScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

In the record effect, after `saveGame`:

```ts
const winnerSeat = outcome === 'draw' ? null : seatOf(state, outcome)
const result: GameResult = outcome === 'draw' ? 'draw' : winnerSeat === 'p1' ? 'win' : 'loss'
// ...ladder advance as before...
onAchievement?.({
  kind: 'game',
  mode: settings.mode,
  result,
  board: state.board,
  symbol: state.p1Symbol,
  finishedAt: now,
  ...(isBot && ladder ? { band: bandOf(rung), rungBefore: rung, rungAfter: next?.rung ?? rung } : {}),
})
```

Note `band` here is the real band of the rung (for "first win at Hard"), not the label band. Remove `moment` state except for `lost-top` (keep `momentAfter` only to drive "Take it back"), remove `NOTE_FOR`, `cardOpen`, `TopCard`, `share`, `siteUrl`; `note` becomes `finished ? banter ?? undefined : undefined`; `Celebration` shows only for `youWon`. Remove the `feedback.play({ kind: 'start' })` on moments. Delete `TopCard.tsx`. In `HistorySheet`, remove `TopBadge`, the `TOP_SHARE_TEXT` import, `share`, `siteUrl`, and the `Button` import if unused; update its tests that looked for the badge.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/GameScreen.test.tsx src/components/HistorySheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/components
git commit -m "feat(game): emit achievement events; retire moments fanfare"
```

---

### Task 12: SeriesScreen and RoomScreen emit events and carry badges

**Files:**
- Modify: `src/components/SeriesScreen.tsx`, `src/components/RoomScreen.tsx`
- Test: `src/components/SeriesScreen.test.tsx`, `src/components/RoomScreen.test.tsx`

**Interfaces:**
- `SeriesScreen` gains `onAchievement?: (event: GameEvent | SeriesEvent) => void`.
- `RoomScreen` gains `badge: AchievementId | null` and `onAchievement?: (event: AchievementEvent) => void`.

- [ ] **Step 1: Write the failing tests**

SeriesScreen (using the file's referee+player harness over the fake connection):

```tsx
it('players report each finished game and the series; watchers report nothing', async () => {
  // play game 1 to a challenger win
  expect(refereeEvents).toContainEqual(expect.objectContaining({ kind: 'game', mode: 'online', result: 'win', opponentId: challenged.deviceId }))
  expect(playerEvents).toContainEqual(expect.objectContaining({ kind: 'game', mode: 'online', result: 'loss' }))
  expect(watcherEvents).toHaveLength(0)
  // finish the series 6–0 for the challenger
  expect(refereeEvents.at(-1)).toEqual(expect.objectContaining({ kind: 'series', won: true, mine: 6, theirs: 0, tieBreak: false, trailedBy3: false, roomId: 'r1' }))
})
it('marks trailedBy3 once a player was three behind', ...) // challenged wins 3, challenger then wins 6
it('a resigned series reports a series event and no extra game event', ...)
```

RoomScreen:

```tsx
it('tracks the badge in presence and sends it on a challenge', async () => {
  // render with badge 'closer'; expect roomConn presence meta badge 'closer'; challenge someone; the sent event's from.badge is 'closer'
})
it('shows a badge above a member and reports watching', async () => {
  // a member with badge 'the-immovable' present → getByRole('img', { name: 'The Immovable' })
  // Watch a pair → onAchievement called with { kind: 'watched' }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/SeriesScreen.test.tsx src/components/RoomScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement SeriesScreen**

Track per-game reporting with a ref of the last reported game number, and trailing with a ref:

```ts
const reportedGame = useRef(0)
const trailedBy3 = useRef(false)
const seriesReported = useRef(false)
useEffect(() => {
  if (!isPlayer || !mySide || !opponent) return
  const mine = state.score[mySide]
  const theirs = state.score[otherSide(mySide)]
  if (theirs - mine >= 3) trailedBy3.current = true
  if (state.game.status !== 'playing' && reportedGame.current !== state.gameNumber) {
    reportedGame.current = state.gameNumber
    const mySymbol = symbolOf(state.game, seatOfSide(mySide))
    const result = state.game.status === 'draw' ? 'draw' : state.game.winner === mySymbol ? 'win' : 'loss'
    onAchievement?.({ kind: 'game', mode: 'online', result, board: state.game.board, symbol: mySymbol, finishedAt: now(), opponentId: opponent.deviceId, opponentBadge: badgeOf(opponent) })
  }
  if (state.result && !seriesReported.current) {
    seriesReported.current = true
    const won = state.result.winner.deviceId === self.deviceId
    onAchievement?.({ kind: 'series', won, mine, theirs, trailedBy3: trailedBy3.current, tieBreak: state.gameNumber > SERIES_GAMES, roomId: state.roomId, opponentId: opponent.deviceId, opponentBadge: badgeOf(opponent) })
  }
}, [state, isPlayer, mySide, opponent, onAchievement, now, self.deviceId])
```

`badgeOf = (p: SeriesPlayer) => (isAchievementId(p.badge) ? p.badge : null)`. Watch out: a game ended by resignation leaves `game.status === 'playing'`, so no game event fires, matching the spec. Names: render `<AchievementBadge id={playerOf(state, side).badge} />` above each name in the series bar (wrap the bar's two names in `inline-flex flex-col items-center`).

- [ ] **Step 4: Implement RoomScreen**

- Presence: `roomConn.track({ deviceId, nickname, status, gameId, ...(badge ? { badge } : {}) })`; add `badge` to the effect deps.
- `challenge`: `from: { ...self, ...(badge ? { badge } : {}) }`; `accept`'s `startSeries(room.id, incoming.gameId, incoming.player, { ...self, badge })`.
- `watch`: call `onAchievement?.({ kind: 'watched' })`.
- Pass `onAchievement` and the self-with-badge to `SeriesScreen`.
- Render `<AchievementBadge id={m.badge} />` above the name in the People list, both names in "in progress" rows, the challenge dialog title, `ResultRow` names (when the result carries one), and the vs splash title.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/components/SeriesScreen.test.tsx src/components/RoomScreen.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SeriesScreen.tsx src/components/RoomScreen.tsx src/components/SeriesScreen.test.tsx src/components/RoomScreen.test.tsx
git commit -m "feat(online): achievement events and badges in rooms and series"
```

---

### Task 13: App wiring: state, sync, toast, wipe, reset

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
describe('App achievements', () => {
  it('unlocks Hello, Bot after the first bot game, toasts it, saves locally, and pushes to the cloud', async () => {
    // start a bot game, play to any result (existing helpers), then:
    expect(await screen.findByRole('status')).toHaveTextContent('Hello, Bot')
    expect(loadAchievements(localStorage).unlocks['hello-bot']).toBeDefined()
    expect(await directory.loadAchievements(deviceId)).toEqual(expect.objectContaining({ unlocks: expect.objectContaining({ 'hello-bot': expect.any(Number) }) }))
  })
  it('merges the cloud copy on launch and pushes when local has more', async () => { /* seed directory with landlord, local with hello-bot; after mount both have both */ })
  it('opens the Achievements sheet from setup', ...)
  it('wearing a badge from Settings changes what presence carries', ...) // optional if RoomScreen test covers presence
  it('wipes local game data when registered and the player row is gone, keeping the device id', async () => {
    localStorage.setItem(REGISTERED_KEY, '1'); localStorage.setItem(NICKNAME_KEY, 'Ann'); localStorage.setItem(LADDER_KEY, '...')
    // directory has no player → after mount: nickname null, ladder gone, registered flag gone, device key kept
  })
  it('does not wipe a device that never registered', ...)
  it('marks the device registered after the first successful savePlayer', ...)
  it('developer reset also clears achievements locally and in the cloud', ...)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `App`:

```ts
const [achievements, setAchievements] = useState<AchievementState>(() => loadAchievements(storage))
const achievementsRef = useRef(achievements)
achievementsRef.current = achievements
const [toasts, setToasts] = useState<AchievementId[]>([])
const popToast = useCallback(() => setToasts((q) => q.slice(1)), [])

const pushAchievements = useCallback((state: AchievementState) => {
  services?.directory.saveAchievements(deviceId, playerToken, state).catch(() => {})
}, [services, deviceId, playerToken])

const applyAchievement = useCallback((event: AchievementEvent) => {
  const { state, unlocked } = record(achievementsRef.current, event, Date.now())
  achievementsRef.current = state
  setAchievements(state)
  saveAchievements(storage, state)
  if (unlocked.length > 0) setToasts((q) => [...q, ...unlocked])
  pushAchievements(state)
}, [pushAchievements])

const setBadge = (badge: AchievementId | null) => {
  const state = { ...achievementsRef.current, badge, updatedAt: Date.now() }
  achievementsRef.current = state
  setAchievements(state)
  saveAchievements(storage, state)
  pushAchievements(state)
}
```

Launch and `online` sync: replace the existing launch effect with one `useEffect` keyed on `[services, deviceId, playerToken, connected]` that runs `syncCloud()`:

```ts
async function syncCloud() {
  const { directory } = services
  let player: PlayerRecord | null
  try { player = await directory.loadPlayer(deviceId) } catch { return }
  if (shouldWipe(isRegistered(storage), player)) {
    wipeLocal(storage)
    setNickname(null)
    achievementsRef.current = EMPTY_STATE
    setAchievements(EMPTY_STATE)
    return // nothing to push; the next nickname registers again
  }
  // unsynced games + ladder as today (moved here verbatim)
  const cloud = await directory.loadAchievements(deviceId).catch(() => null)
  const merged = merge(achievementsRef.current, cloud)
  if (merged.localChanged) { achievementsRef.current = merged.state; setAchievements(merged.state); saveAchievements(storage, merged.state) }
  if (merged.cloudBehind) pushAchievements(merged.state)
}
```

Guard against the effect running the sync twice in StrictMode with a `cancelled` flag as the existing effects do; skip entirely when `!connected`. The player upsert effect: after a successful `savePlayer`, call `markRegistered(storage)`.

Grand Master confetti: when `toasts[0] === 'grand-master'` render `<Celebration />` beside the toast.

Reset: add `ACHIEVEMENTS_KEY` and `SHOW_HIDDEN_KEY` to `resetGameData`'s key list and reset `achievementsRef` / state to `EMPTY_STATE`.

Wiring: `GameScreen onAchievement={applyAchievement}` (drop `share`, `siteUrl`); `RoomScreen badge={wornBadge(achievements)} onAchievement={applyAchievement}`; `createRoom` calls `applyAchievement({ kind: 'room-created' })` after a successful create; `SetupScreen onOpenAchievements={() => setAchievementsOpen(true)}`; `<AchievementsSheet open state={achievements} storage={storage} />`; `SettingsSheet badge={{ unlocks: achievements.unlocks, worn: wornBadge(achievements), onChange: setBadge }}`; `<AchievementToast queue={toasts} onDone={popToast} feedback={feedback} />` inside `AppShell` before the screens. Remove `share` / `siteUrl` from `HistorySheet`; `withoutRoomParam` stays for the `?room=` cleanup. If `AppDeps.share` becomes unused, remove it and the `shareLink` import (keep `platform/share.ts` for room links).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat(app): achievements state, cloud sync, toast queue, wiped-device reset"
```

---

### Task 14: Docs and full verification

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `docs/superpowers/specs/2026-09-25-adaptive-bot-design.md`

- [ ] **Step 1: Docs**

`CLAUDE.md` Layout: add `src/lib/achievements.ts` (catalogue, progress, `record`, `merge`, storage; fully tested), `src/lib/reset.ts` (wiped-device detection), `components/AchievementsSheet.tsx`, `AchievementToast.tsx`, `AchievementBadge.tsx`; update the ladder line (moments now only drive "Take it back"); `schema.sql` list gains `achievements`, `save_achievements`. Conventions: a line on achievements (offline-first, cloud mirror, badge in presence). Summary paragraph: mention achievements. `README.md`: a short "Achievements" section and the full-reset query under the Supabase section. Adaptive-bot spec: replace the moments fanfare and badge sections with a pointer to the achievements spec, and delete the deferred TODO bullets for badge and achievements.

- [ ] **Step 2: Full suite and types**

Run:

```bash
npx vitest run
```

Expected: all green.

```bash
npx tsc -b --noEmit && rm -f tsconfig.tsbuildinfo
```

Expected: no errors.

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md docs
git commit -m "docs: achievements"
```

Then stop: the owner tests on the phone before anything is pushed.
