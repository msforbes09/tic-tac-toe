import type { HistoryStorage } from './history'
import type { Difficulty, Mode, Player, Settings } from './types'

export const SETUP_KEY = 'tic-tac-toe:setup'
export const DEFAULT_SETTINGS: Settings = { mode: 'pvp', difficulty: 'medium', p1Symbol: 'X' }

const MODES: Mode[] = ['pvp', 'bot']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const SYMBOLS: Player[] = ['X', 'O']

const oneOf = <T,>(allowed: T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/** The setup used for the last game, field by field, with defaults for anything missing or invalid. */
export function loadSetup(storage: HistoryStorage): Settings {
  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SETUP_KEY) ?? '{}')
    if (typeof parsed === 'object' && parsed !== null) saved = parsed as Record<string, unknown>
  } catch {
    // Unreadable or unavailable storage: start from the defaults.
  }
  return {
    mode: oneOf(MODES, saved.mode, DEFAULT_SETTINGS.mode),
    difficulty: oneOf(DIFFICULTIES, saved.difficulty, DEFAULT_SETTINGS.difficulty),
    p1Symbol: oneOf(SYMBOLS, saved.p1Symbol, DEFAULT_SETTINGS.p1Symbol),
  }
}

export function saveSetup(storage: HistoryStorage, settings: Settings): void {
  try {
    storage.setItem(SETUP_KEY, JSON.stringify(settings))
  } catch {
    // Best-effort, like history.
  }
}
