import type { Difficulty, Mode, Outcome, Player, Seat } from './types'

export type HistoryEntry = {
  id: string
  timestamp: number
  mode: Mode
  difficulty: Difficulty | null
  outcome: Outcome
  /** The symbol player one (you, against the bot) played. Older entries lack it and were X. */
  p1Symbol?: Player
  /** The bot's rung on the ladder (1..30) for bot games. Older entries lack it. */
  rung?: number
}

export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const STORAGE_KEY = 'tic-tac-toe:history'
export const MAX_ENTRIES = 100

const MODES: Mode[] = ['pvp', 'bot', 'online']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const OUTCOMES: Outcome[] = ['X', 'O', 'draw']
const SYMBOLS: Player[] = ['X', 'O']

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.timestamp === 'number' &&
    MODES.includes(v.mode as Mode) &&
    (v.difficulty === null || DIFFICULTIES.includes(v.difficulty as Difficulty)) &&
    OUTCOMES.includes(v.outcome as Outcome) &&
    (v.p1Symbol === undefined || SYMBOLS.includes(v.p1Symbol as Player)) &&
    (v.rung === undefined || (Number.isInteger(v.rung) && (v.rung as number) >= 1 && (v.rung as number) <= 30))
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

export function newEntryId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Which seat won, reading entries saved before symbol choice as player one playing X. */
export function winnerSeat(entry: HistoryEntry): Seat | null {
  if (entry.outcome === 'draw') return null
  return entry.outcome === (entry.p1Symbol ?? 'X') ? 'p1' : 'p2'
}

export type BotRecord = { wins: number; losses: number; draws: number }

/** Your record against the bot at each difficulty. Two-player games are ignored. */
export function botStats(entries: HistoryEntry[]): Record<Difficulty, BotRecord> {
  const stats = Object.fromEntries(
    DIFFICULTIES.map((d) => [d, { wins: 0, losses: 0, draws: 0 }]),
  ) as Record<Difficulty, BotRecord>
  for (const e of entries) {
    if (e.mode !== 'bot' || e.difficulty === null) continue
    const seat = winnerSeat(e)
    const record = stats[e.difficulty]
    if (seat === null) record.draws++
    else if (seat === 'p1') record.wins++
    else record.losses++
  }
  return stats
}
