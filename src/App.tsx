import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GameScreen } from '@/components/GameScreen'
import { HistorySheet } from '@/components/HistorySheet'
import { OnlinePanel } from '@/components/OnlinePanel'
import { RoomScreen } from '@/components/RoomScreen'
import { SetupScreen } from '@/components/SetupScreen'
import { Splash } from '@/components/Splash'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { gameRowFromEntry, markSynced, unsyncedEntries, type HistoryEntry, type HistoryStorage } from '@/lib/history'
import { loadLadder, newerLadder, saveLadder, type Ladder } from '@/lib/ladder'
import {
  loadDeviceId,
  loadNickname,
  loadOwnedRooms,
  loadPlayerToken,
  newToken,
  removeOwnedRoom,
  saveNickname,
  saveOwnedRoom,
  sha256Hex,
} from '@/lib/identity'
import { installNudge, loadInstallDismissedAt, saveInstallDismissedAt } from '@/lib/install'
import { randomName, uniqueName } from '@/lib/names'
import type { OpenChannel } from '@/lib/realtime'
import {
  LOBBY_CHANNEL,
  createId,
  isLobbyPresence,
  readSupabaseConfig,
  roomCodeFromUrl,
  withoutRoomParam,
  type LobbyPresence,
} from '@/lib/room'
import type { RoomDirectory, RoomRecord } from '@/lib/roomDirectory'
import { loadSetup, saveSetup } from '@/lib/setup'
import type { Mode, Settings } from '@/lib/types'
import { createBrowserFeedback } from '@/platform/browserFeedback'
import { browserInstallPlatform, type InstallPlatform } from '@/platform/install'
import { shareLink, type ShareLink } from '@/platform/share'
import { createSupabaseServices } from '@/platform/supabase'

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
  /** Realtime channels; null when online play is not configured. */
  open?: OpenChannel | null
  /** Rooms and results storage; null when online play is not configured. */
  directory?: RoomDirectory | null
  hash?: (text: string) => Promise<string>
  share?: ShareLink
  /** The page URL at load, for `?room=` links. */
  url?: string
  replaceUrl?: (url: string) => void
  install?: InstallPlatform
  newId?: () => string
  random?: () => number
}

type Services = { open: OpenChannel; directory: RoomDirectory }

function defaultServices(): Services | null {
  const config = readSupabaseConfig(import.meta.env as Record<string, unknown>)
  return config ? createSupabaseServices(config) : null
}

type Screen =
  | { kind: 'setup' }
  | { kind: 'game'; settings: Settings }
  | { kind: 'room'; room: RoomRecord; ownerToken: string | null }

export default function App({ deps = {} }: { deps?: AppDeps }) {
  const [services] = useState<Services | null>(() => {
    if (deps.open === undefined && deps.directory === undefined) return defaultServices()
    return deps.open && deps.directory ? { open: deps.open, directory: deps.directory } : null
  })
  const hash = deps.hash ?? sha256Hex
  const url = deps.url ?? window.location.href
  const replaceUrl = deps.replaceUrl ?? ((next: string) => window.history.replaceState(null, '', next))
  const newId = deps.newId ?? (() => createId(6))
  const random = deps.random ?? Math.random
  const share = deps.share ?? shareLink
  // The bare site link, for bragging: whatever room code the page opened with is dropped.
  const siteUrl = withoutRoomParam(url)

  const [deviceId] = useState(() => loadDeviceId(storage))
  const [playerToken] = useState(() => loadPlayerToken(storage))
  const [nickname, setNickname] = useState<string | null>(() => loadNickname(storage))

  // Keep our player row current: created on the first nickname, touched on every visit after.
  useEffect(() => {
    if (!services || !nickname) return
    services.directory.savePlayer({ id: deviceId, nickname }, playerToken).catch(() => {})
  }, [services, nickname, deviceId, playerToken])

  // Games finished offline reach the cloud on the next launch; the newer ladder copy wins.
  useEffect(() => {
    if (!services) return
    const { directory } = services
    // Online games were once written locally too; those rows belong to `results`, so just retire them.
    const unsynced = unsyncedEntries(storage)
    const legacy = unsynced.filter((e) => e.mode === 'online')
    if (legacy.length > 0) markSynced(storage, legacy.map((e) => e.id))
    const pending = unsynced.filter((e) => e.mode !== 'online')
    if (pending.length > 0) {
      directory
        .addGames(pending.map((e) => gameRowFromEntry(e, deviceId)))
        .then(() => markSynced(storage, pending.map((e) => e.id)))
        .catch(() => {})
    }
    directory
      .loadLadder(deviceId)
      .then((cloud) => {
        const local = loadLadder(storage)
        const winner = newerLadder(local, cloud)
        if (winner !== local) {
          const { playerId: _id, ...ladder } = winner as typeof winner & { playerId?: string }
          saveLadder(storage, ladder)
        }
        else if (local.updatedAt > 0 && (!cloud || cloud.updatedAt < local.updatedAt)) return directory.saveLadder(deviceId, playerToken, local)
      })
      .catch(() => {})
  }, [services, deviceId, playerToken])

  // Each finished two-player or bot game goes straight to the cloud, along with the moved ladder.
  const onRecorded = useCallback(
    (entry: HistoryEntry, ladder: Ladder | null) => {
      if (!services) return
      services.directory
        .addGames([gameRowFromEntry(entry, deviceId)])
        .then(() => markSynced(storage, [entry.id]))
        .catch(() => {})
      if (ladder) services.directory.saveLadder(deviceId, playerToken, ladder).catch(() => {})
    },
    [services, deviceId, playerToken],
  )
  const [suggestedNickname] = useState(() => randomName(random))
  const [screen, setScreen] = useState<Screen>({ kind: 'setup' })
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(() => {
    const code = roomCodeFromUrl(url)
    if (code) replaceUrl(withoutRoomParam(url))
    return code
  })
  // Setup opens on the last offline mode, except straight after a room link or after leaving a room.
  const [initialMode, setInitialMode] = useState<Mode | null>(pendingRoomId && services ? 'online' : null)
  // The mode currently picked on setup; History shows that mode's games.
  const [setupMode, setSetupMode] = useState<Mode>(() => {
    if (pendingRoomId && services) return 'online'
    const saved = loadSetup(storage).mode
    return saved === 'online' && !services ? 'pvp' : saved
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [rooms, setRooms] = useState<RoomRecord[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [replacePrompt, setReplacePrompt] = useState<RoomRecord | null>(null)

  const [splash, setSplash] = useState(true)
  const endSplash = useCallback(() => setSplash(false), [])

  // Install nudge.
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

  // The room list and live head counts, while on setup with online available.
  const onSetup = screen.kind === 'setup'
  useEffect(() => {
    if (!services || !onSetup) return
    return services.directory.onRoomsChange(setRooms)
  }, [services, onSetup])
  useEffect(() => {
    if (!services || !onSetup) return
    let cancelled = false
    let leave = () => {}
    void services.open<LobbyPresence>(LOBBY_CHANNEL, deviceId).then((c) => {
      if (cancelled) return c.leave()
      leave = () => c.leave()
      const tally = (members: { meta: LobbyPresence }[]) => {
        const next: Record<string, number> = {}
        for (const m of members) if (isLobbyPresence(m.meta)) next[m.meta.roomId] = (next[m.meta.roomId] ?? 0) + 1
        setCounts(next)
      }
      c.onPresence(tally)
      tally(c.members())
    })
    return () => {
      cancelled = true
      leave()
    }
  }, [services, onSetup, deviceId])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when the screen changes
  const owned = useMemo(() => loadOwnedRooms(storage), [screen])
  const ownedRoom = rooms?.find((r) => r.id in owned) ?? null

  const enter = useCallback((room: RoomRecord) => {
    setNotice(null)
    setScreen({ kind: 'room', room, ownerToken: loadOwnedRooms(storage)[room.id] ?? null })
  }, [])

  // A ?room= link: enter once we know who we are and what rooms exist.
  useEffect(() => {
    if (!pendingRoomId || !services || !nickname || rooms === null) return
    const room = rooms.find((r) => r.id === pendingRoomId)
    setPendingRoomId(null)
    if (room) enter(room)
    else setNotice('That room is gone')
  }, [pendingRoomId, services, nickname, rooms, enter])

  const createRoom = async () => {
    if (!services || !nickname) return
    const id = newId()
    const name = uniqueName((rooms ?? []).map((r) => r.name), random)
    const token = newToken()
    const room = await services.directory.createRoom({ id, name, creatorId: deviceId, ownerHash: await hash(token) })
    saveOwnedRoom(storage, id, token)
    setNotice(null)
    setScreen({ kind: 'room', room, ownerToken: token })
  }
  const onCreate = () => {
    if (ownedRoom) setReplacePrompt(ownedRoom)
    else void createRoom()
  }
  const replaceRoom = async () => {
    if (!services || !replacePrompt) return
    const old = replacePrompt
    setReplacePrompt(null)
    const token = loadOwnedRooms(storage)[old.id]
    if (token) await services.directory.deleteRoom(old.id, token)
    removeOwnedRoom(storage, old.id)
    await createRoom()
  }

  const leaveRoom = useCallback((roomNotice?: string) => {
    setInitialMode('online')
    setNotice(roomNotice ?? null)
    setScreen({ kind: 'setup' })
  }, [])

  const self = useMemo(() => (nickname ? { deviceId, nickname } : null), [deviceId, nickname])

  return (
    <AppShell>
      {screen.kind === 'game' && (
        <GameScreen
          settings={screen.settings}
          storage={storage}
          feedback={feedback}
          onBack={() => setScreen({ kind: 'setup' })}
          share={share}
          siteUrl={siteUrl}
          onRecorded={onRecorded}
        />
      )}
      {screen.kind === 'room' && services && self && (
        <RoomScreen
          key={screen.room.id}
          room={screen.room}
          self={self}
          ownerToken={screen.ownerToken}
          open={services.open}
          directory={services.directory}
          storage={storage}
          feedback={feedback}
          onLeave={leaveRoom}
        />
      )}
      {screen.kind === 'setup' && (
        <SetupScreen
          initial={{ ...loadSetup(storage), ...(initialMode ? { mode: initialMode } : {}) }}
          onStart={(next) => {
            saveSetup(storage, next)
            setInitialMode(null)
            setScreen({ kind: 'game', settings: next })
          }}
          onOpenHistory={() => setHistoryOpen(true)}
          onModeChange={setSetupMode}
          online={{
            available: services !== null,
            panel: services && (
              <>
                {notice && (
                  <p
                    role="status"
                    className="rounded-[14px] bg-muted/70 px-4 py-2.5 text-center text-sm text-muted-foreground dark:bg-muted/50"
                  >
                    {notice}
                  </p>
                )}
                <OnlinePanel
                  nickname={nickname}
                  suggestedNickname={suggestedNickname}
                  onSaveNickname={(name) => {
                    saveNickname(storage, name)
                    setNickname(name)
                  }}
                  rooms={rooms ?? []}
                  counts={counts}
                  ownedRoomId={ownedRoom?.id ?? null}
                  onCreate={onCreate}
                  onEnter={enter}
                />
              </>
            ),
          }}
          install={installOffer}
        />
      )}
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        storage={storage}
        mode={setupMode}
        cloud={services ? { deviceId, directory: services.directory } : undefined}
        online={services && nickname ? { deviceId, directory: services.directory } : undefined}
        share={share}
        siteUrl={siteUrl}
      />

      <AlertDialog open={replacePrompt !== null} onOpenChange={(o) => !o && setReplacePrompt(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your room {replacePrompt?.name} and create a new one?</AlertDialogTitle>
            <AlertDialogDescription>You can have one room at a time. Its results go with it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => void replaceRoom()}>
              Delete and create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {splash && <Splash onDone={endSplash} feedback={feedback} />}
    </AppShell>
  )
}
