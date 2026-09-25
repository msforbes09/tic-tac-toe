import type { Tone } from './banter'
import type { HistoryStorage } from './history'

/** The bot's tone, chosen from Settings ("Aggressive bot"). Friendly unless switched. */
export const TONE_KEY = 'tic-tac-toe:tone'

export function loadTone(storage: HistoryStorage): Tone {
  try {
    return storage.getItem(TONE_KEY) === 'cocky' ? 'cocky' : 'friendly'
  } catch {
    return 'friendly'
  }
}

export function saveTone(storage: HistoryStorage, tone: Tone): void {
  try {
    storage.setItem(TONE_KEY, tone)
  } catch {
    // Best-effort, like the rest of local storage.
  }
}
