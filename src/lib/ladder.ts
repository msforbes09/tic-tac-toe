import type { HistoryStorage } from './history'
import type { Difficulty } from './types'

/**
 * The hidden ladder behind the bot. Thirty rungs in three bands of ten; the rung moves after every
 * finished bot game. See docs/superpowers/specs/2026-09-25-adaptive-bot-design.md.
 */
export const TOP_RUNG = 30
const BAND_SIZE = 10
const BANDS: Difficulty[] = ['easy', 'medium', 'hard']
/** From this many wins (or losses) in a row, each result moves two rungs instead of one. */
const HOT_STREAK = 3
/** Dropping into a lower band takes this many losses in a row. */
const DEMOTION_LOSSES = 3

export type GameResult = 'win' | 'loss' | 'draw'
export type Moment = 'promoted' | 'top' | 'top-held' | 'lost-top'

export type Ladder = {
  rung: number | null
  /** Consecutive wins (positive) or losses (negative). A draw resets it. */
  streak: number
  /** When rung 30 was first held to a draw; null until then. */
  topHeldAt: number | null
  /** How many draws at rung 30 so far. */
  topHeldCount: number
}

export const LADDER_KEY = 'tic-tac-toe:ladder'
export const EMPTY_LADDER: Ladder = { rung: null, streak: 0, topHeldAt: null, topHeldCount: 0 }

const clamp = (rung: number) => Math.min(TOP_RUNG, Math.max(1, rung))
const bandIndex = (rung: number) => Math.min(BANDS.length - 1, Math.floor((clamp(rung) - 1) / BAND_SIZE))

export function bandOf(rung: number): Difficulty {
  return BANDS[bandIndex(rung)]
}

export function bandBottom(band: Difficulty): number {
  return BANDS.indexOf(band) * BAND_SIZE + 1
}

export function bandMiddle(band: Difficulty): number {
  return bandBottom(band) + BAND_SIZE / 2 - 1
}

/**
 * The ladder after a finished bot game. Win up, loss down, draw stays, with two-rung steps on a
 * hot streak and a band only lost on the third straight loss. Draws at the top are counted.
 */
export function advance(ladder: Ladder, result: GameResult, now: number): Ladder {
  const rung = ladder.rung ?? 1
  if (result === 'draw') {
    const held = rung === TOP_RUNG
    return {
      ...ladder,
      rung,
      streak: 0,
      topHeldAt: held ? (ladder.topHeldAt ?? now) : ladder.topHeldAt,
      topHeldCount: held ? ladder.topHeldCount + 1 : ladder.topHeldCount,
    }
  }
  if (result === 'win') {
    const streak = ladder.streak > 0 ? ladder.streak + 1 : 1
    return { ...ladder, rung: clamp(rung + (streak >= HOT_STREAK ? 2 : 1)), streak }
  }
  const streak = ladder.streak < 0 ? ladder.streak - 1 : -1
  let next = clamp(rung - (streak <= -HOT_STREAK ? 2 : 1))
  if (bandOf(next) !== bandOf(rung) && -streak < DEMOTION_LOSSES) next = bandBottom(bandOf(rung))
  return { ...ladder, rung: next, streak }
}

/**
 * Where a setup choice lands you. A first-ever game starts at the bottom of the picked band.
 * Picking your own band changes nothing. Picking another band nudges you halfway toward its
 * middle, rounded down, so the buttons pull rather than teleport.
 */
export function rungForSelection(current: number | null, band: Difficulty): number {
  if (current === null) return bandBottom(band)
  if (bandOf(current) === band) return current
  return Math.floor((current + bandMiddle(band)) / 2)
}

/** What a finished bot game deserves beyond its result, given the ladder before and after it. */
export function momentAfter(before: Ladder, after: Ladder, result: GameResult): Moment | null {
  const from = before.rung ?? 1
  const to = after.rung ?? 1
  if (result === 'draw') return from === TOP_RUNG && before.topHeldAt === null ? 'top-held' : null
  if (result === 'loss') return from === TOP_RUNG ? 'lost-top' : null
  if (to === TOP_RUNG && from < TOP_RUNG) return 'top'
  if (bandIndex(to) > bandIndex(from)) return 'promoted'
  return null
}

const isRung = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= TOP_RUNG
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

export function loadLadder(storage: HistoryStorage): Ladder {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LADDER_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_LADDER
    const v = parsed as Record<string, unknown>
    return {
      rung: isRung(v.rung) ? v.rung : null,
      streak: Number.isInteger(v.streak) ? (v.streak as number) : 0,
      topHeldAt: isTime(v.topHeldAt) ? v.topHeldAt : null,
      topHeldCount: isCount(v.topHeldCount) ? v.topHeldCount : 0,
    }
  } catch {
    return EMPTY_LADDER
  }
}

export function saveLadder(storage: HistoryStorage, ladder: Ladder): void {
  try {
    storage.setItem(LADDER_KEY, JSON.stringify(ladder))
  } catch {
    // Best-effort, like history.
  }
}
