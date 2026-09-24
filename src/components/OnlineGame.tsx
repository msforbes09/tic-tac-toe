import { useEffect, useRef, useState } from 'react'
import { GameScreen } from './GameScreen'
import { OnlineLobby, type LobbyStatus } from './OnlineLobby'
import type { Feedback } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import { lobbyState, roomLink, type Member, type Role } from '@/lib/room'
import type { OpenRoom, RoomConnection } from '@/lib/roomConnection'
import type { Settings } from '@/lib/types'
import type { ShareLink } from '@/platform/share'

export type OnlineGameProps = {
  code: string
  role: Role
  openRoom: OpenRoom
  storage: HistoryStorage
  feedback: Feedback
  share: ShareLink
  /** The app's own URL, for the share link. */
  baseUrl: string
  onBack: () => void
}

/** The host is p1 and plays X in the first game; after that the usual seat rules apply. */
const ONLINE_SETTINGS: Settings = { mode: 'online', difficulty: 'medium', p1Symbol: 'X' }

export function OnlineGame({ code, role, openRoom, storage, feedback, share, baseUrl, onBack }: OnlineGameProps) {
  const [connection, setConnection] = useState<RoomConnection | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [failed, setFailed] = useState(false)
  const [started, setStarted] = useState(false)
  const live = useRef<RoomConnection | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}
    openRoom(code, role).then(
      (conn) => {
        if (cancelled) {
          conn.leave()
          return
        }
        live.current = conn
        unsubscribe = conn.onPresence(setMembers)
        setMembers(conn.members())
        setConnection(conn)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
      unsubscribe()
      live.current?.leave()
      live.current = null
    }
  }, [openRoom, code, role])

  const lobby = connection ? lobbyState(members, connection.selfId) : 'waiting'
  // Stay connected while "full": the earlier guest may be a phantom from a cancelled open (StrictMode,
  // a quick rejoin) that leaves a moment later, at which point this member plays. A real third
  // person sees Room is full and leaves on Back.
  const full = !started && lobby === 'full'

  useEffect(() => {
    if (lobby === 'playing') setStarted(true)
  }, [lobby])

  if (started && connection) {
    return (
      <GameScreen
        settings={ONLINE_SETTINGS}
        storage={storage}
        feedback={feedback}
        onBack={onBack}
        online={{ role, code, connection, friendPresent: lobby === 'playing' }}
      />
    )
  }

  const status: LobbyStatus = failed ? 'error' : !connection ? 'connecting' : full ? 'full' : 'waiting'
  return (
    <OnlineLobby code={code} role={role} status={status} link={roomLink(baseUrl, code)} share={share} onCancel={onBack} />
  )
}
