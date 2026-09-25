import type { HistoryStorage } from './history'
import type { Difficulty, Mode } from './types'

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
