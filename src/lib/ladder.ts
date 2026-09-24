import type { HistoryStorage } from './history'
import type { Difficulty } from './types'

/**
 * The hidden ladder behind the bot. Thirty rungs in three bands of ten; the rung moves one step
 * per finished bot game. See docs/superpowers/specs/2026-09-25-adaptive-bot-design.md.
 */
export const TOP_RUNG = 30
const BAND_SIZE = 10
const BANDS: Difficulty[] = ['easy', 'medium', 'hard']

export type GameResult = 'win' | 'loss' | 'draw'
export type Moment = 'promoted' | 'top' | 'top-held'
export type Ladder = { rung: number | null; topHeldAt: number | null }

export const LADDER_KEY = 'tic-tac-toe:ladder'
export const EMPTY_LADDER: Ladder = { rung: null, topHeldAt: null }

const clamp = (rung: number) => Math.min(TOP_RUNG, Math.max(1, rung))

export function bandOf(rung: number): Difficulty {
  return BANDS[Math.min(BANDS.length - 1, Math.floor((clamp(rung) - 1) / BAND_SIZE))]
}

export function bandBottom(band: Difficulty): number {
  return BANDS.indexOf(band) * BAND_SIZE + 1
}

export function bandMiddle(band: Difficulty): number {
  return bandBottom(band) + BAND_SIZE / 2 - 1
}

/** Win up one, loss down one, draw stays; never off the ladder. */
export function rungAfter(rung: number, result: GameResult): number {
  const step = result === 'win' ? 1 : result === 'loss' ? -1 : 0
  return clamp(rung + step)
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

/**
 * What a finished bot game deserves beyond its result. `held` is whether the top has already
 * been held to a draw once, which is celebrated only the first time.
 */
export function momentAfter(before: number, after: number, result: GameResult, held: boolean): Moment | null {
  if (result === 'draw') return before === TOP_RUNG && !held ? 'top-held' : null
  if (after === TOP_RUNG && before < TOP_RUNG) return 'top'
  if (BANDS.indexOf(bandOf(after)) > BANDS.indexOf(bandOf(before))) return 'promoted'
  return null
}

const isRung = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= TOP_RUNG
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function loadLadder(storage: HistoryStorage): Ladder {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LADDER_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_LADDER
    const v = parsed as Record<string, unknown>
    return { rung: isRung(v.rung) ? v.rung : null, topHeldAt: isTime(v.topHeldAt) ? v.topHeldAt : null }
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
