import { WIN_LINES } from './game'
import type { HistoryStorage } from './history'
import { TOP_RUNG } from './ladder'
import type { Board, Difficulty, Mode, Player } from './types'

/**
 * PlayStation-style achievements: a catalogue, a flat progress record, and the rules that turn
 * one into unlocks. See docs/superpowers/specs/2026-09-26-achievements-design.md.
 */
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'
export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum']
export const TIER_COLOR: Record<Tier, string> = { bronze: '#cd7f32', silver: '#b8c0c8', gold: '#f2c14e', platinum: '#9fe3ff' }

// id, tier, name, condition, lucide icon, hidden until unlocked
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
const BY_ID = new Map<string, Achievement>(ACHIEVEMENTS.map((a) => [a.id, a]))
export const isAchievementId = (v: unknown): v is AchievementId => typeof v === 'string' && BY_ID.has(v)
export const achievementById = (id: AchievementId): Achievement => BY_ID.get(id) as Achievement

export type Progress = {
  games: Record<Mode, number>
  wins: Record<Mode, number>
  botWinsByBand: Record<Difficulty, number>
  botDraws: number
  promotions: number
  seriesPlayed: number
  seriesWon: number
  /** Bot and online games only; two-player games leave the streaks alone. */
  winStreak: number
  unbeatenStreak: number
  lossStreak: number
  /** Distinct rooms a series finished in, capped. */
  rooms: string[]
  /** Series per opponent id, capped. */
  opponents: Record<string, number>
  /** Distinct local days with a finished game, tracked with the last one seen. */
  days: number
  lastDay: string | null
  diagonalWins: number
  centreWins: number
  /** The last bot game was a loss at rung 30. */
  lostAtTop: boolean
  watched: boolean
  roomsCreated: number
}

export type Unlocks = Partial<Record<AchievementId, number>>
/** `badge` undefined means "never chose": the default is worn. Null means None. */
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

// ---- Events and rules ---------------------------------------------------------------------------

export type GameEvent = {
  kind: 'game'
  mode: Mode
  result: 'win' | 'loss' | 'draw'
  board: Board
  /** The symbol this device (or Player 1) played. */
  symbol: Player
  finishedAt: number
  /** Bot games: the real band of the rung played, and the ladder before and after. */
  band?: Difficulty
  rungBefore?: number
  rungAfter?: number
  /** Online games. */
  opponentId?: string
  opponentBadge?: AchievementId | null
  /** Set by `record` from the progress before the event; callers leave it out. */
  lostAtTopBefore?: boolean
}
export type SeriesEvent = {
  kind: 'series'
  won: boolean
  mine: number
  theirs: number
  /** At some point this player was 3 or more behind. */
  trailedBy3: boolean
  /** Decided in game 11 or later. */
  tieBreak: boolean
  /** Played out to a decision, not handed over by a resignation or a drop. */
  decided: boolean
  roomId: string
  opponentId: string
  opponentBadge: AchievementId | null
}
export type AchievementEvent = GameEvent | SeriesEvent | { kind: 'room-created' } | { kind: 'watched' }

const DEEP_END_RUNG = 25
const MAX_OPPONENTS = 50
const MAX_ROOMS = 10

const localDay = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const hour = (t: number) => new Date(t).getHours()
const bandIndex = (rung: number) => Math.min(2, Math.floor((rung - 1) / 10))
const winningLine = (board: Board, symbol: Player) => WIN_LINES.find((line) => line.every((i) => board[i] === symbol)) ?? null
const marksOf = (board: Board, symbol: Player) => board.filter((c) => c === symbol).length
const totalGames = (p: Progress) => p.games.pvp + p.games.bot + p.games.online
const rankedWins = (p: Progress) => p.wins.bot + p.wins.online

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
      if (line[1] === 4 && (line[0] === 0 || line[0] === 2)) next.diagonalWins = p.diagonalWins + 1
    }
  }
  const day = localDay(e.finishedAt)
  if (day !== p.lastDay) {
    next.days = p.days + 1
    next.lastDay = day
  }
  return next
}

function applySeries(p: Progress, e: SeriesEvent): Progress {
  const rooms = p.rooms.includes(e.roomId) ? p.rooms : [...p.rooms, e.roomId].slice(-MAX_ROOMS)
  const opponents = { ...p.opponents, [e.opponentId]: (p.opponents[e.opponentId] ?? 0) + 1 }
  const keys = Object.keys(opponents)
  if (keys.length > MAX_OPPONENTS) delete opponents[keys[0]]
  return { ...p, seriesPlayed: p.seriesPlayed + 1, seriesWon: p.seriesWon + (e.won ? 1 : 0), rooms, opponents }
}

function applyEvent(p: Progress, e: AchievementEvent): Progress {
  switch (e.kind) {
    case 'game':
      return applyGame(p, e)
    case 'series':
      return applySeries(p, e)
    case 'room-created':
      return { ...p, roomsCreated: p.roomsCreated + 1 }
    case 'watched':
      return { ...p, watched: true }
  }
}

type Rule = (p: Progress, e: AchievementEvent) => boolean
const onGame = (test: (e: GameEvent) => boolean): Rule => (_p, e) => e.kind === 'game' && test(e)
const onSeries = (test: (e: SeriesEvent) => boolean): Rule => (_p, e) => e.kind === 'series' && test(e)

/** Every achievement but Grand Master: does the progress after the event (and the event itself) earn it? */
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
  regular: (p) => totalGames(p) >= 10,
  'night-owl': onGame((e) => hour(e.finishedAt) < 4),
  'rough-night': (p) => p.lossStreak >= 5,
  'early-bird': onGame((e) => hour(e.finishedAt) >= 5 && hour(e.finishedAt) < 7),
  'full-circle': (p) => p.games.pvp >= 1 && p.games.bot >= 1 && p.games.online >= 1,
  closer: (p) => p.seriesWon >= 1,
  'high-five': (p) => p.winStreak >= 5,
  unbroken: (p) => p.unbeatenStreak >= 5,
  century: (p) => p.games.bot >= 100,
  'comeback-kid': onSeries((e) => e.won && e.decided && e.trailedBy3),
  'bounce-back': onGame((e) => e.mode === 'bot' && e.result === 'win' && e.lostAtTopBefore === true),
  'frequent-flyer': (p) => p.rooms.length >= 3,
  fifty: (p) => rankedWins(p) >= 50,
  'fast-hands': onGame((e) => e.result === 'win' && marksOf(e.board, e.symbol) === 3),
  'sly-diagonal': (p) => p.diagonalWins >= 10,
  'centre-stage': (p) => p.centreWins >= 10,
  stalemate: (p) => p.botDraws >= 10,
  'old-rivals': (p) => Object.values(p.opponents).some((n) => n >= 3),
  'week-warrior': (p) => p.days >= 7,
  'perfect-ten': (p) => p.winStreak >= 10,
  untouchable: (p) => p.unbeatenStreak >= 10,
  'clean-sweep': onSeries((e) => e.won && e.mine === 6 && e.theirs === 0),
  'top-of-the-pack': onGame((e) => e.mode === 'bot' && e.rungAfter === TOP_RUNG && (e.rungBefore ?? TOP_RUNG) < TOP_RUNG),
  'the-immovable': onGame((e) => e.mode === 'bot' && e.result === 'draw' && e.rungBefore === TOP_RUNG),
  marathon: (p) => totalGames(p) >= 500,
  tiebreaker: onSeries((e) => e.won && e.decided && e.tieBreak),
  'two-hundred': (p) => rankedWins(p) >= 200,
  'giant-killer': onSeries((e) => e.won && e.opponentBadge === 'the-immovable'),
  'deep-end': onGame((e) => e.mode === 'bot' && e.result === 'win' && (e.rungBefore ?? 0) >= DEEP_END_RUNG),
}

/** Apply one event, then unlock whatever the new progress earns. Never unlocks twice; stamps `now`. */
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

// ---- The badge ------------------------------------------------------------------------------------

/** The highest tier unlocked, newest among equals; null when nothing is unlocked. */
export function defaultBadge(unlocks: Unlocks): AchievementId | null {
  let best: Achievement | null = null
  for (const a of ACHIEVEMENTS) {
    const at = unlocks[a.id]
    if (at === undefined) continue
    if (best === null) {
      best = a
      continue
    }
    const rank = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(best.tier)
    if (rank > 0 || (rank === 0 && at > (unlocks[best.id] as number))) best = a
  }
  return best?.id ?? null
}

/** What the player wears: their pick while it is unlocked, None when they chose it, else the default. */
export function wornBadge(state: AchievementState): AchievementId | null {
  if (state.badge === null) return null
  if (state.badge !== undefined && state.unlocks[state.badge] !== undefined) return state.badge
  return defaultBadge(state.unlocks)
}

// ---- Cloud merge ----------------------------------------------------------------------------------

const sameState = (a: AchievementState, b: AchievementState) =>
  a.updatedAt === b.updatedAt &&
  a.badge === b.badge &&
  JSON.stringify(a.unlocks) === JSON.stringify(b.unlocks) &&
  JSON.stringify(a.progress) === JSON.stringify(b.progress)

/**
 * Local and cloud copies meet: unlocks are the union (earliest time wins), progress and badge come
 * from whichever copy moved last. `localChanged` says the local copy should be saved, `cloudBehind`
 * that the cloud should be pushed.
 */
export function merge(local: AchievementState, cloud: AchievementState | null): { state: AchievementState; localChanged: boolean; cloudBehind: boolean } {
  if (!cloud) return { state: local, localChanged: false, cloudBehind: local.updatedAt > 0 }
  const unlocks: Unlocks = { ...cloud.unlocks }
  for (const [id, at] of Object.entries(local.unlocks) as [AchievementId, number][]) {
    const c = unlocks[id]
    if (c === undefined || at < c) unlocks[id] = at
  }
  const newer = cloud.updatedAt > local.updatedAt ? cloud : local
  const state: AchievementState = { progress: newer.progress, unlocks, updatedAt: Math.max(local.updatedAt, cloud.updatedAt) }
  if (newer.badge !== undefined) state.badge = newer.badge
  return { state, localChanged: !sameState(state, local), cloudBehind: !sameState(state, cloud) }
}

// ---- Storage --------------------------------------------------------------------------------------

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

/** Anything shaped like a saved state, from storage or the cloud; unknown ids and bad counters are dropped. */
export function readAchievementState(v: unknown): AchievementState {
  if (!isObj(v)) return EMPTY_STATE
  const unlocks: Unlocks = {}
  if (isObj(v.unlocks)) {
    for (const [k, t] of Object.entries(v.unlocks)) if (isAchievementId(k) && typeof t === 'number' && Number.isFinite(t)) unlocks[k] = t
  }
  const state: AchievementState = {
    progress: readProgress(v.progress),
    unlocks,
    updatedAt: typeof v.updatedAt === 'number' && Number.isFinite(v.updatedAt) ? v.updatedAt : 0,
  }
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
