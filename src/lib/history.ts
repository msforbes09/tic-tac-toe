import type { Difficulty, Mode, Outcome } from './types'

export type HistoryEntry = {
  id: string
  timestamp: number
  mode: Mode
  difficulty: Difficulty | null
  outcome: Outcome
}

export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const STORAGE_KEY = 'tic-tac-toe:history'
export const MAX_ENTRIES = 100

const MODES: Mode[] = ['pvp', 'bot']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const OUTCOMES: Outcome[] = ['X', 'O', 'draw']

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.timestamp === 'number' &&
    MODES.includes(v.mode as Mode) &&
    (v.difficulty === null || DIFFICULTIES.includes(v.difficulty as Difficulty)) &&
    OUTCOMES.includes(v.outcome as Outcome)
  )
}

export function loadHistory(storage: HistoryStorage): HistoryEntry[] {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isEntry)
}

export function saveGame(storage: HistoryStorage, entry: HistoryEntry): HistoryEntry[] {
  const list = [entry, ...loadHistory(storage)].slice(0, MAX_ENTRIES)
  storage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function clearHistory(storage: HistoryStorage): void {
  storage.removeItem(STORAGE_KEY)
}

export function newEntryId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
