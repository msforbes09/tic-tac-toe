import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GameScreen } from '@/components/GameScreen'
import { HistorySheet } from '@/components/HistorySheet'
import { OnlineGame } from '@/components/OnlineGame'
import { SetupScreen } from '@/components/SetupScreen'
import { Splash } from '@/components/Splash'
import type { HistoryStorage } from '@/lib/history'
import { installNudge, loadInstallDismissedAt, saveInstallDismissedAt } from '@/lib/install'
import { createRoomCode, readSupabaseConfig, roomCodeFromUrl, withoutRoomParam, type Role } from '@/lib/room'
import type { OpenRoom } from '@/lib/roomConnection'
import { loadSetup, saveSetup } from '@/lib/setup'
import type { Settings } from '@/lib/types'
import { createBrowserFeedback } from '@/platform/browserFeedback'
import { browserInstallPlatform, type InstallPlatform } from '@/platform/install'
import { shareLink, type ShareLink } from '@/platform/share'
import { createSupabaseOpenRoom } from '@/platform/supabaseRoom'

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
  /** Null when online play is not configured. */
  openRoom?: OpenRoom | null
  share?: ShareLink
  /** The page URL at load, for `?room=` links. */
  url?: string
  replaceUrl?: (url: string) => void
  install?: InstallPlatform
}

function defaultOpenRoom(): OpenRoom | null {
  const config = readSupabaseConfig(import.meta.env as Record<string, unknown>)
  return config ? createSupabaseOpenRoom(config) : null
}

type Screen = { kind: 'setup' } | { kind: 'game'; settings: Settings } | { kind: 'online'; role: Role; code: string }

export default function App({ deps = {} }: { deps?: AppDeps }) {
  const [openRoom] = useState<OpenRoom | null>(() => (deps.openRoom === undefined ? defaultOpenRoom() : deps.openRoom))
  const share = deps.share ?? shareLink
  const url = deps.url ?? window.location.href
  const replaceUrl = deps.replaceUrl ?? ((next: string) => window.history.replaceState(null, '', next))

  const [screen, setScreen] = useState<Screen>(() => {
    const code = roomCodeFromUrl(url)
    if (code && openRoom) {
      replaceUrl(withoutRoomParam(url))
      return { kind: 'online', role: 'guest', code }
    }
    return { kind: 'setup' }
  })
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
      {screen.kind === 'online' && openRoom && (
        <OnlineGame
          code={screen.code}
          role={screen.role}
          openRoom={openRoom}
          storage={storage}
          feedback={feedback}
          share={share}
          baseUrl={url}
          onBack={toSetup}
        />
      )}
      {screen.kind === 'setup' && (
        <SetupScreen
          initial={loadSetup(storage)}
          onStart={(next) => {
            saveSetup(storage, next)
            setScreen({ kind: 'game', settings: next })
          }}
          onOpenHistory={() => setHistoryOpen(true)}
          online={{
            available: openRoom !== null,
            onCreate: () => setScreen({ kind: 'online', role: 'host', code: createRoomCode() }),
            onJoin: (code) => setScreen({ kind: 'online', role: 'guest', code }),
          }}
          install={installOffer}
        />
      )}
      {splash && <Splash onDone={endSplash} feedback={feedback} />}
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} storage={storage} />
    </AppShell>
  )
}
