import { ACHIEVEMENTS_KEY, SHOW_HIDDEN_KEY } from './achievements'
import { STORAGE_KEY as HISTORY_KEY, type HistoryStorage } from './history'
import { NICKNAME_KEY, OWNED_KEY } from './identity'
import { LADDER_KEY } from './ladder'
import type { PlayerRecord } from './roomDirectory'
import { SETUP_KEY } from './setup'

/**
 * The full reset. When every cloud table is emptied by hand, a device that had registered finds
 * its player row gone on the next launch and wipes its own game data to match. See
 * docs/superpowers/specs/2026-09-26-achievements-design.md.
 */

/** Set once this device's player row has been written; a missing row after that means the cloud was wiped. */
export const REGISTERED_KEY = 'tic-tac-toe:registered'

/** Everything that is game data. The device id, the player token, and developer mode are not. */
export const WIPE_KEYS = [HISTORY_KEY, LADDER_KEY, ACHIEVEMENTS_KEY, SETUP_KEY, NICKNAME_KEY, OWNED_KEY, SHOW_HIDDEN_KEY, REGISTERED_KEY]

export const isRegistered = (storage: HistoryStorage): boolean => storage.getItem(REGISTERED_KEY) === '1'

export function markRegistered(storage: HistoryStorage): void {
  try {
    storage.setItem(REGISTERED_KEY, '1')
  } catch {
    // Best-effort.
  }
}

/** Only a device the cloud once knew, and no longer does, is wiped. Callers pass null only after a successful lookup. */
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
