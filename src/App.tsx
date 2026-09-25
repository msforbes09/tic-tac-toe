import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AchievementToast } from '@/components/AchievementToast'
import { AchievementsSheet } from '@/components/AchievementsSheet'
import { AppShell } from '@/components/AppShell'
import { Celebration } from '@/components/Celebration'
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
import {
  ACHIEVEMENTS_KEY,
  EMPTY_STATE,
  loadAchievements,
  merge,
  record,
  saveAchievements,
  wornBadge,
  type AchievementEvent,
  type AchievementId,
  type AchievementState,
} from '@/lib/achievements'
import type { HistoryStorage } from '@/lib/history'
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
import { isRegistered, markRegistered, shouldWipe, wipeLocal } from '@/lib/reset'
import type { PlayerRecord, RoomDirectory, RoomRecord } from '@/lib/roomDirectory'
import { DevDialog } from '@/components/DevDialog'
import { STORAGE_KEY as HISTORY_KEY, gameRowFromEntry, markSynced, unsyncedEntries, type HistoryEntry } from '@/lib/history'
import { KNOCK, KNOCK_DELAY_MS, knockStep, type KnockEvent } from '@/lib/knock'
import { LADDER_KEY, loadLadder, newerLadder, saveLadder, suggestedBand, type Ladder } from '@/lib/ladder'
import { SETUP_KEY, loadSetup, saveSetup } from '@/lib/setup'
import { loadTone, saveTone } from '@/lib/tone'
import { SettingsSheet } from '@/components/SettingsSheet'
import type { Mode, Settings } from '@/lib/types'
import { createBrowserFeedback } from '@/platform/browserFeedback'
import { useNetworkOnline } from '@/platform/network'
import { browserInstallPlatform, type InstallPlatform } from '@/platform/install'
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

  const [deviceId] = useState(() => loadDeviceId(storage))
  const [playerToken] = useState(() => loadPlayerToken(storage))
  const [nickname, setNickname] = useState<string | null>(() => loadNickname(storage))
  // Airplane mode and the like: Online is shown disabled until the connection is back.
  const connected = useNetworkOnline()

  // Achievements: the local copy is the truth on the device and is pushed whenever there is a
  // connection. The ref lets screens report events without waiting for a render.
  const [achievements, setAchievements] = useState<AchievementState>(() => loadAchievements(storage))
  const achievementsRef = useRef(achievements)
  achievementsRef.current = achievements
  const [toasts, setToasts] = useState<AchievementId[]>([])
  const popToast = useCallback(() => setToasts((q) => q.slice(1)), [])
  const pushAchievements = useCallback(
    (state: AchievementState) => {
      services?.directory.saveAchievements(deviceId, playerToken, state).catch(() => {})
    },
    [services, deviceId, playerToken],
  )
  const commitAchievements = useCallback(
    (state: AchievementState) => {
      achievementsRef.current = state
      setAchievements(state)
      saveAchievements(storage, state)
      pushAchievements(state)
    },
    [pushAchievements],
  )
  const applyAchievement = useCallback(
    (event: AchievementEvent) => {
      const { state, unlocked } = record(achievementsRef.current, event, Date.now())
      commitAchievements(state)
      if (unlocked.length > 0) setToasts((q) => [...q, ...unlocked])
    },
    [commitAchievements],
  )
  const setBadge = (badge: AchievementId | null) => commitAchievements({ ...achievementsRef.current, badge, updatedAt: Date.now() })

  // Keep our player row current: created on the first nickname, touched on every visit after.
  // Once it has been written, the device counts as registered: a missing row later means a wipe.
  // The write waits for the wipe check below, so a wiped device is not quietly re-registered.
  const [cloudChecked, setCloudChecked] = useState(false)
  useEffect(() => {
    if (!services || !nickname || !cloudChecked) return
    services.directory
      .savePlayer({ id: deviceId, nickname }, playerToken)
      .then(() => markRegistered(storage))
      .catch(() => {})
  }, [services, nickname, deviceId, playerToken, cloudChecked])

  // On launch and whenever the connection returns: first the wipe check, then games finished
  // offline reach the cloud, the newer ladder copy wins, and the achievements copies merge.
  useEffect(() => {
    if (!services || !connected) return
    const { directory } = services
    let cancelled = false
    const sync = async () => {
      // Read before the lookup: a registration that lands mid-flight must not turn a null row into a wipe.
      const registered = isRegistered(storage)
      let player: PlayerRecord | null
      try {
        player = await directory.loadPlayer(deviceId)
      } catch {
        // The cloud cannot be read, so nothing is decided this pass and nothing is pushed. A device
        // that never registered may still register; a registered one waits for a successful check,
        // or a wipe could be escaped by re-creating the row.
        if (!cancelled && !registered) setCloudChecked(true)
        return
      }
      if (cancelled) return
      if (shouldWipe(registered, player)) {
        wipeLocal(storage)
        setNickname(null)
        achievementsRef.current = EMPTY_STATE
        setAchievements(EMPTY_STATE)
        setCloudChecked(true)
        return // Nothing left to push; the next nickname registers the device again.
      }
      setCloudChecked(true)
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
          } else if (local.updatedAt > 0 && (!cloud || cloud.updatedAt < local.updatedAt)) return directory.saveLadder(deviceId, playerToken, local)
        })
        .catch(() => {})
      const cloud = await directory.loadAchievements(deviceId).catch(() => null)
      if (cancelled) return
      const merged = merge(achievementsRef.current, cloud)
      if (merged.localChanged) {
        achievementsRef.current = merged.state
        setAchievements(merged.state)
        saveAchievements(storage, merged.state)
      }
      if (merged.cloudBehind) directory.saveAchievements(deviceId, playerToken, merged.state).catch(() => {})
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [services, deviceId, playerToken, connected])

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
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tone, setTone] = useState(() => loadTone(storage))

  // Developer mode: opened by the secret knock, a sequence of taps the screens report here.
  // In memory only, so it ends with the session; the knock is ignored while it is already on.
  const [devMode, setDevMode] = useState(false)
  const [devDialog, setDevDialog] = useState(false)
  const [knockProgress, setKnockProgress] = useState(0)
  // True during the two-second wait after the knock. Any tap or Back in that window calls it off.
  const [knockPending, setKnockPending] = useState(false)
  const cancelKnock = useCallback(() => {
    setKnockPending(false)
    setScreen({ kind: 'setup' })
  }, [])
  const knock = useCallback(
    (event: KnockEvent): boolean => {
      if (devMode) return false
      if (knockPending) {
        cancelKnock()
        return false
      }
      const next = knockStep(knockProgress, event)
      const done = next === KNOCK.length
      setKnockProgress(done ? 0 : next)
      if (done) setKnockPending(true)
      return done
    },
    [knockProgress, knockPending, devMode, cancelKnock],
  )
  useEffect(() => {
    if (!knockPending) return
    const id = setTimeout(() => {
      setKnockPending(false)
      setDevDialog(true)
    }, KNOCK_DELAY_MS)
    return () => clearTimeout(id)
  }, [knockPending])
  // Developer reset: this device's games, ladder, achievements, and remembered setup, locally and in the cloud.
  const resetGameData = () => {
    for (const key of [HISTORY_KEY, LADDER_KEY, SETUP_KEY, ACHIEVEMENTS_KEY]) {
      try {
        storage.removeItem(key)
      } catch {
        // Best-effort.
      }
    }
    achievementsRef.current = EMPTY_STATE
    setAchievements(EMPTY_STATE)
    services?.directory.resetPlayerData(deviceId, playerToken).catch(() => {})
  }
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
  const installState = { standalone: install.standalone || installed, promptAvailable, ios: install.ios, now: Date.now() }
  const onInstall = () => {
    void install.prompt().then((outcome) => {
      if (outcome === 'accepted') setInstalled(true)
    })
  }
  // The card on setup honours "Not now"; Settings keeps offering until the app is installed.
  const nudge = installNudge({ ...installState, dismissedAt })
  const settingsInstall = installNudge({ ...installState, dismissedAt: null })
  const installOffer =
    nudge === 'hidden'
      ? undefined
      : {
          kind: nudge,
          onInstall,
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
    applyAchievement({ kind: 'room-created' })
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
      <AchievementToast queue={toasts} onDone={popToast} feedback={feedback} />
      {toasts[0] === 'grand-master' && <Celebration />}
      {screen.kind === 'game' && (
        <GameScreen
          settings={screen.settings}
          storage={storage}
          feedback={feedback}
          onBack={() => (knockPending ? cancelKnock() : setScreen({ kind: 'setup' }))}
          dev={devMode}
          onKnock={knock}
          onRecorded={onRecorded}
          onAchievement={applyAchievement}
          tone={tone}
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
          badge={wornBadge(achievements)}
          onAchievement={applyAchievement}
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
          onOpenAchievements={() => setAchievementsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          tone={tone}
          onModeChange={setSetupMode}
          dev={devMode ? { rung: loadLadder(storage).rung } : undefined}
          suggested={suggestedBand(loadLadder(storage)) ?? undefined}
          onKnock={knock}
          online={{
            available: services !== null && connected,
            reason: services !== null && !connected ? 'Offline' : undefined,
            onCreate,
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
                  rooms={rooms}
                  counts={counts}
                  ownedRoomId={ownedRoom?.id ?? null}
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
        onKnock={knock}
      />

      <AchievementsSheet open={achievementsOpen} onOpenChange={setAchievementsOpen} state={achievements} />

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        nickname={nickname}
        suggestedNickname={suggestedNickname}
        onSaveNickname={(name) => {
          saveNickname(storage, name)
          setNickname(name)
        }}
        tone={tone}
        onToneChange={(next) => {
          saveTone(storage, next)
          setTone(next)
        }}
        badge={{ unlocks: achievements.unlocks, worn: wornBadge(achievements), onChange: setBadge }}
        install={settingsInstall === 'hidden' ? undefined : { kind: settingsInstall, onInstall }}
        // Developer tools, while developer mode is on. Each action lands on the setup screen.
        dev={
          devMode
            ? {
                rung: loadLadder(storage).rung,
                onSetRung: (rung) => {
                  saveLadder(storage, { ...loadLadder(storage), rung, streak: 0 })
                  setScreen({ kind: 'setup' })
                },
                onReset: () => {
                  resetGameData()
                  setScreen({ kind: 'setup' })
                },
                onExit: () => {
                  setDevMode(false)
                  setScreen({ kind: 'setup' })
                },
              }
            : undefined
        }
      />

      <DevDialog
        open={devDialog}
        // Enter or Cancel, either way the knock's voided game is left behind for the setup screen.
        onClose={() => {
          setDevDialog(false)
          setScreen({ kind: 'setup' })
        }}
        onEnter={() => setDevMode(true)}
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
