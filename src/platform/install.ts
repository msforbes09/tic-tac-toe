/** What the browser can tell us about installing the app as a home-screen icon. */
export type InstallPlatform = {
  /** Already running from the home screen. */
  standalone: boolean
  /** iPhone or iPad: installing is manual via Share → Add to Home Screen. */
  ios: boolean
  /** Reports whether a one-tap install prompt is available, now and as it changes. */
  onPromptAvailable(callback: (available: boolean) => void): () => void
  /** Shows the browser's install prompt. Resolves with what the person chose. */
  prompt(): Promise<'accepted' | 'dismissed'>
}

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Captures `beforeinstallprompt` (Chrome, Edge, Android browsers) so the setup screen can offer
 * Install. Create it at startup: the event can fire before React mounts. Browsers never allow
 * forcing an install, so this only ever offers.
 */
export function browserInstallPlatform(win: Window = window): InstallPlatform {
  let deferred: BeforeInstallPromptEvent | null = null
  const listeners = new Set<(available: boolean) => void>()
  const notify = () => {
    for (const l of listeners) l(deferred !== null)
  }

  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  win.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })

  const nav = win.navigator as Navigator & { standalone?: boolean }
  const standalone =
    (typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches) ||
    nav.standalone === true
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)

  return {
    standalone,
    ios,
    onPromptAvailable(callback) {
      listeners.add(callback)
      callback(deferred !== null)
      return () => listeners.delete(callback)
    },
    async prompt() {
      const event = deferred
      if (!event) return 'dismissed'
      deferred = null
      notify()
      await event.prompt()
      const { outcome } = await event.userChoice
      return outcome
    },
  }
}
