import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GameScreen } from '@/components/GameScreen'
import { HistorySheet } from '@/components/HistorySheet'
import { SetupScreen } from '@/components/SetupScreen'
import { Splash } from '@/components/Splash'
import type { HistoryStorage } from '@/lib/history'
import { installNudge, loadInstallDismissedAt, saveInstallDismissedAt } from '@/lib/install'
import { loadSetup, saveSetup } from '@/lib/setup'
import type { Settings } from '@/lib/types'
import { createBrowserFeedback } from '@/platform/browserFeedback'
import { browserInstallPlatform, type InstallPlatform } from '@/platform/install'
import type { ShareLink } from '@/platform/share'

const noopStorage: HistoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

function browserStorage(): HistoryStorage {
  try {
    const s = window.localStorage
    s.getItem('tic-tac-toe:probe')
    return s
  } catch {
    return noopStorage
  }
}

const storage = browserStorage()
const feedback = createBrowserFeedback()
// Created at startup: beforeinstallprompt can fire before React mounts.
const installPlatform = browserInstallPlatform()

export type AppDeps = {
  share?: ShareLink
  /** The page URL at load, for `?room=` links. */
  url?: string
  replaceUrl?: (url: string) => void
  install?: InstallPlatform
}

type Screen = { kind: 'setup' } | { kind: 'game'; settings: Settings }

export default function App({ deps = {} }: { deps?: AppDeps }) {
  void deps.share
  void deps.url
  void deps.replaceUrl
  const [screen, setScreen] = useState<Screen>({ kind: 'setup' })
  const [historyOpen, setHistoryOpen] = useState(false)
  const toSetup = () => setScreen({ kind: 'setup' })

  const [splash, setSplash] = useState(true)
  const endSplash = useCallback(() => setSplash(false), [])

  const install = deps.install ?? installPlatform
  const [promptAvailable, setPromptAvailable] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissedAt, setDismissedAt] = useState(() => loadInstallDismissedAt(storage))
  useEffect(() => install.onPromptAvailable(setPromptAvailable), [install])
  const nudge = installNudge({
    standalone: install.standalone || installed,
    promptAvailable,
    ios: install.ios,
    dismissedAt,
    now: Date.now(),
  })
  const installOffer =
    nudge === 'hidden'
      ? undefined
      : {
          kind: nudge,
          onInstall: () => {
            void install.prompt().then((outcome) => {
              if (outcome === 'accepted') setInstalled(true)
            })
          },
          onDismiss: () => {
            const now = Date.now()
            saveInstallDismissedAt(storage, now)
            setDismissedAt(now)
          },
        }

  return (
    <AppShell>
      {screen.kind === 'game' && (
        <GameScreen settings={screen.settings} storage={storage} feedback={feedback} onBack={toSetup} />
      )}
      {screen.kind === 'setup' && (
        <SetupScreen
          initial={loadSetup(storage)}
          onStart={(next) => {
            saveSetup(storage, next)
            setScreen({ kind: 'game', settings: next })
          }}
          onOpenHistory={() => setHistoryOpen(true)}
          install={installOffer}
        />
      )}
      {splash && <Splash onDone={endSplash} />}
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} storage={storage} />
    </AppShell>
  )
}
