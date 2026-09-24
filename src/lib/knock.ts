import type { HistoryStorage } from './history'

/**
 * The secret knock that opens developer mode: a sequence of taps across setup, the History
 * sheet, and the board. Screens report their taps as events; App keeps the progress.
 */
export type KnockEvent =
  | 'mode:pvp'
  | 'mode:bot'
  | 'history:open'
  | 'history:back'
  | 'start'
  | `cell:${number}`

export const KNOCK: KnockEvent[] = [
  'mode:pvp',
  'mode:bot',
  'mode:pvp',
  'history:open',
  'history:back',
  'start',
  'cell:0',
  'cell:4',
  'cell:8',
  'cell:2',
  'cell:4',
]

/** The pause after the last tap before the developer dialog opens. */
export const KNOCK_DELAY_MS = 2000

/** Progress after an event: one step further on a match, back to the start otherwise. */
export function knockStep(progress: number, event: KnockEvent): number {
  if (progress < KNOCK.length && KNOCK[progress] === event) return progress + 1
  return KNOCK[0] === event ? 1 : 0
}

export const DEV_MODE_KEY = 'tic-tac-toe:dev'

export function loadDevMode(storage: HistoryStorage): boolean {
  try {
    return storage.getItem(DEV_MODE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveDevMode(storage: HistoryStorage, on: boolean): void {
  try {
    if (on) storage.setItem(DEV_MODE_KEY, '1')
    else storage.removeItem(DEV_MODE_KEY)
  } catch {
    // Best-effort, like history.
  }
}
