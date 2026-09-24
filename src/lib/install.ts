import type { HistoryStorage } from './history'

export const INSTALL_DISMISSED_KEY = 'tic-tac-toe:install-dismissed'
/** After "Not now", the card stays away this long. */
export const INSTALL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

export type InstallNudge = 'hidden' | 'prompt' | 'ios-steps'

export type InstallNudgeInput = {
  /** Already opened from the home screen. */
  standalone: boolean
  /** The browser fired beforeinstallprompt, so a one-tap install is possible. */
  promptAvailable: boolean
  /** iPhone or iPad, where installing is manual: Share → Add to Home Screen. */
  ios: boolean
  dismissedAt: number | null
  now: number
}

/** Which install card, if any, the setup screen shows. Browsers cannot force an install. */
export function installNudge({ standalone, promptAvailable, ios, dismissedAt, now }: InstallNudgeInput): InstallNudge {
  if (standalone) return 'hidden'
  if (dismissedAt !== null && now - dismissedAt < INSTALL_SNOOZE_MS) return 'hidden'
  if (promptAvailable) return 'prompt'
  if (ios) return 'ios-steps'
  return 'hidden'
}

export function loadInstallDismissedAt(storage: HistoryStorage): number | null {
  try {
    const raw = storage.getItem(INSTALL_DISMISSED_KEY)
    if (raw === null) return null
    const at = Number(raw)
    return Number.isFinite(at) ? at : null
  } catch {
    return null
  }
}

export function saveInstallDismissedAt(storage: HistoryStorage, now: number): void {
  try {
    storage.setItem(INSTALL_DISMISSED_KEY, String(now))
  } catch {
    // Best-effort, like the rest of storage.
  }
}
