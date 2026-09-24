import { useCallback, useEffect, useRef, useState } from 'react'
import { Interstitial } from './Interstitial'
import { SeriesScreen } from './SeriesScreen'
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
import { Button } from '@/components/ui/button'
import type { Feedback } from '@/lib/feedback'
import type { HistoryStorage } from '@/lib/history'
import type { Connection, OpenChannel } from '@/lib/realtime'
import {
  CHALLENGE_TIMEOUT_MS,
  LOBBY_CHANNEL,
  createId,
  isRoomEvent,
  isRoomPresence,
  pairsInProgress,
  roomChannel,
  type LobbyPresence,
  type MemberStatus,
  type RoomPresence,
  type SeriesPlayer,
  type SeriesResult,
} from '@/lib/room'
import type { RoomDirectory, RoomRecord } from '@/lib/roomDirectory'
import { cn } from '@/lib/utils'
import { startSeries, type SeriesState } from '@/state/series'

export type RoomScreenProps = {
  room: RoomRecord
  self: SeriesPlayer
  /** Set when this device created the room; enables Delete room. */
  ownerToken: string | null
  open: OpenChannel
  directory: RoomDirectory
  storage: HistoryStorage
  feedback: Feedback
  /** Back to the list; the notice, if any, is shown there. */
  onLeave: (notice?: string) => void
  newId?: () => string
  now?: () => number
}

type Activity =
  | { kind: 'idle' }
  | { kind: 'series'; state: SeriesState; role: 'referee' | 'player' }
  | { kind: 'watching'; state: SeriesState }

type Pending = { gameId: string; player: SeriesPlayer }

const STATUS_LABEL: Record<MemberStatus, string> = { idle: 'Idle', playing: 'Playing', watching: 'Watching' }

export function resultLine(r: SeriesResult): string {
  if (r.reason === 'resigned') return `${r.loser.nickname} resigned to ${r.winner.nickname} at ${r.loserScore}–${r.winnerScore}`
  if (r.reason === 'left') return `${r.loser.nickname} left; ${r.winner.nickname} wins ${r.winnerScore}–${r.loserScore}`
  return `${r.winner.nickname} beat ${r.loser.nickname} ${r.winnerScore}–${r.loserScore}`
}

/**
 * A room: who is here, who is playing whom, past results, and challenges. An accepted challenge
 * opens the series screen over the room; tapping a game in progress opens it as a watcher.
 */
export function RoomScreen({ room, self, ownerToken, open, directory, storage, feedback, onLeave, newId = () => createId(8), now = Date.now }: RoomScreenProps) {
  const [roomConn, setRoomConn] = useState<Connection<RoomPresence> | null>(null)
  const [lobbyConn, setLobbyConn] = useState<Connection<LobbyPresence> | null>(null)
  const [members, setMembers] = useState<RoomPresence[]>([])
  const [results, setResults] = useState<SeriesResult[]>([])
  const [activity, setActivity] = useState<Activity>({ kind: 'idle' })
  const [outgoing, setOutgoing] = useState<Pending | null>(null)
  const [incoming, setIncoming] = useState<Pending | null>(null)
  const [vsSplash, setVsSplash] = useState<{ gameId: string; players: SeriesPlayer[] } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const shownVs = useRef(new Set<string>())
  const left = useRef(false)
  const latest = useRef({ activity, outgoing, incoming })
  latest.current = { activity, outgoing, incoming }
  const selfRef = useRef(self)
  selfRef.current = self
  const feedbackRef = useRef(feedback)
  feedbackRef.current = feedback
  const [note, setNote] = useState<string | null>(null)

  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  const leave = useCallback((notice?: string) => {
    if (left.current) return
    left.current = true
    if (notice === undefined) onLeaveRef.current()
    else onLeaveRef.current(notice)
  }, [])

  const refreshResults = useCallback(() => {
    void directory.listResults(room.id).then(setResults)
  }, [directory, room.id])

  // Room channel: presence and events.
  useEffect(() => {
    let cancelled = false
    let conn: Connection<RoomPresence> | null = null
    let off = () => {}
    let offPresence = () => {}
    void open<RoomPresence>(roomChannel(room.id), self.deviceId).then((c) => {
      if (cancelled) return c.leave()
      conn = c
      offPresence = c.onPresence((list) => setMembers(list.map((m) => m.meta).filter(isRoomPresence)))
      off = c.onMessage((raw) => {
        if (!isRoomEvent(raw)) return
        const me = selfRef.current
        const { activity: act, outgoing: out, incoming: inc } = latest.current
        switch (raw.type) {
          case 'challenge':
            if (raw.to !== me.deviceId) return
            // Busy, already asked, or asking someone ourselves: decline so crossing challenges never both start.
            if (act.kind === 'series' || inc !== null || out !== null) c.send({ type: 'decline', gameId: raw.gameId, from: me.deviceId })
            else {
              setIncoming({ gameId: raw.gameId, player: raw.from })
              feedbackRef.current.play({ kind: 'challenge' })
            }
            return
          case 'accept':
            if (raw.to !== me.deviceId) return
            if (out && out.gameId === raw.gameId && out.player.deviceId === raw.from && act.kind === 'idle') {
              setOutgoing(null)
              feedbackRef.current.play({ kind: 'accepted' })
              setActivity({ kind: 'series', role: 'referee', state: startSeries(room.id, raw.gameId, me, out.player) })
            } else {
              // A late accept for a challenge we withdrew: tell them so they do not sit in an empty series.
              c.send({ type: 'cancel', gameId: raw.gameId, from: me.deviceId })
            }
            return
          case 'decline':
            if (out && out.gameId === raw.gameId) setOutgoing(null)
            return
          case 'cancel':
            if (inc && inc.gameId === raw.gameId) setIncoming(null)
            if (act.kind === 'series' && act.role === 'player' && act.state.gameId === raw.gameId) setActivity({ kind: 'idle' })
            return
          case 'series-ended':
            refreshResults()
            return
          case 'room-deleted':
            leave('The room was deleted')
            return
        }
      })
      setMembers(c.members().map((m) => m.meta).filter(isRoomPresence))
      setRoomConn(c)
    })
    return () => {
      cancelled = true
      off()
      offPresence()
      conn?.leave()
    }
  }, [open, room.id, self.deviceId, leave, refreshResults])

  // Lobby channel: tell the room list we are here.
  useEffect(() => {
    let cancelled = false
    let conn: Connection<LobbyPresence> | null = null
    void open<LobbyPresence>(LOBBY_CHANNEL, self.deviceId).then((c) => {
      if (cancelled) return c.leave()
      conn = c
      c.track({ roomId: room.id, nickname: self.nickname })
      setLobbyConn(c)
    })
    return () => {
      cancelled = true
      conn?.leave()
    }
  }, [open, room.id, self.deviceId, self.nickname])
  void lobbyConn

  // Our presence in the room follows what we are doing.
  useEffect(() => {
    if (!roomConn) return
    const status: MemberStatus = activity.kind === 'series' ? 'playing' : activity.kind === 'watching' ? 'watching' : 'idle'
    const gameId = activity.kind === 'idle' ? null : activity.state.gameId
    roomConn.track({ deviceId: self.deviceId, nickname: self.nickname, status, gameId })
  }, [roomConn, activity, self.deviceId, self.nickname])

  // Results, live from the directory.
  useEffect(() => directory.onResultsChange(room.id, setResults), [directory, room.id])

  // If the room disappears from the directory, everyone goes back to the list.
  useEffect(
    () =>
      directory.onRoomsChange((rooms) => {
        if (!rooms.some((r) => r.id === room.id)) leave('The room was deleted')
      }),
    [directory, room.id, leave],
  )

  // A challenge to or from someone who has disconnected is closed. Presence is trusted only once
  // it includes us, so a fresh connection does not clear anything before the first sync.
  const presenceReady = members.some((m) => m.deviceId === self.deviceId)
  useEffect(() => {
    if (!presenceReady) return
    if (outgoing && !members.some((m) => m.deviceId === outgoing.player.deviceId)) {
      setOutgoing(null)
      setNote(`${outgoing.player.nickname} left before answering`)
    }
    if (incoming && !members.some((m) => m.deviceId === incoming.player.deviceId)) setIncoming(null)
  }, [members, presenceReady, outgoing, incoming])
  useEffect(() => {
    if (!note) return
    const id = setTimeout(() => setNote(null), 4000)
    return () => clearTimeout(id)
  }, [note])

  // An incoming challenge nobody answers goes away on its own too.
  useEffect(() => {
    if (!incoming) return
    const id = setTimeout(() => setIncoming(null), CHALLENGE_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [incoming])

  // An unanswered challenge is withdrawn.
  useEffect(() => {
    if (!outgoing || !roomConn) return
    const id = setTimeout(() => {
      roomConn.send({ type: 'cancel', gameId: outgoing.gameId, from: self.deviceId })
      setOutgoing(null)
    }, CHALLENGE_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [outgoing, roomConn, self.deviceId])

  // A new pair playing: "Alice vs Bob" for everyone idle who has not seen it.
  const pairs = pairsInProgress(members)
  useEffect(() => {
    for (const pair of pairs) {
      if (shownVs.current.has(pair.gameId)) continue
      shownVs.current.add(pair.gameId)
      const mine = pair.players.some((p) => p.deviceId === self.deviceId)
      if (!mine && activity.kind === 'idle') setVsSplash(pair)
    }
  }, [pairs, activity.kind, self.deviceId])

  const challenge = (member: RoomPresence) => {
    if (!roomConn) return
    const gameId = newId()
    const player = { deviceId: member.deviceId, nickname: member.nickname }
    setOutgoing({ gameId, player })
    roomConn.send({ type: 'challenge', gameId, from: self, to: member.deviceId })
  }
  const cancelChallenge = () => {
    if (outgoing) roomConn?.send({ type: 'cancel', gameId: outgoing.gameId, from: self.deviceId })
    setOutgoing(null)
  }
  const accept = () => {
    if (!incoming) return
    if (outgoing) {
      roomConn?.send({ type: 'cancel', gameId: outgoing.gameId, from: self.deviceId })
      setOutgoing(null)
    }
    roomConn?.send({ type: 'accept', gameId: incoming.gameId, from: self.deviceId, to: incoming.player.deviceId })
    setActivity({ kind: 'series', role: 'player', state: startSeries(room.id, incoming.gameId, incoming.player, self) })
    setIncoming(null)
  }
  const decline = () => {
    if (incoming) roomConn?.send({ type: 'decline', gameId: incoming.gameId, from: self.deviceId })
    setIncoming(null)
  }
  const watch = (pair: { gameId: string; players: SeriesPlayer[] }) => {
    setVsSplash(null)
    setActivity({ kind: 'watching', state: startSeries(room.id, pair.gameId, pair.players[0], pair.players[1]) })
  }
  const deleteRoom = async () => {
    setConfirmDelete(false)
    if (!ownerToken) return
    const ok = await directory.deleteRoom(room.id, ownerToken)
    if (!ok) return
    roomConn?.send({ type: 'room-deleted' })
    leave()
  }

  const isYou = (m: RoomPresence) => m.deviceId === self.deviceId
  const canChallenge = (m: RoomPresence) => !isYou(m) && m.status !== 'playing' && activity.kind !== 'series' && outgoing === null

  const challengeDialog = (
    <AlertDialog open={incoming !== null} onOpenChange={(o) => !o && decline()}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{incoming?.player.nickname} challenges you</AlertDialogTitle>
          <AlertDialogDescription>A series to 6 wins. First move is yours.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" onClick={decline}>
            Decline
          </AlertDialogCancel>
          <AlertDialogAction className="min-h-11" onClick={accept}>
            Accept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (activity.kind !== 'idle') {
    return (
      <>
        <SeriesScreen
          key={activity.state.gameId}
          self={self}
          role={activity.kind === 'series' ? activity.role : 'watcher'}
          initial={activity.state}
          open={open}
          storage={storage}
          feedback={feedback}
          addResult={(r) => directory.addResult(r)}
          onResult={(r) => {
            roomConn?.send({ type: 'series-ended', result: r })
            refreshResults()
          }}
          onExit={() => {
            setActivity({ kind: 'idle' })
            refreshResults()
          }}
          now={now}
        />
        {challengeDialog}
      </>
    )
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => leave()} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
          ← Leave
        </Button>
        <h1 className="truncate text-lg font-bold tracking-tight">{room.name}</h1>
        {ownerToken ? (
          <Button variant="ghost" size="sm" className="-mr-2 min-h-11 rounded-xl px-2.5 text-[15px] text-destructive" onClick={() => setConfirmDelete(true)}>
            Delete room
          </Button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      {note && !outgoing && (
        <p role="status" className="rise-in rounded-[14px] bg-muted/70 px-4 py-2.5 text-center text-sm text-muted-foreground dark:bg-muted/50">
          {note}
        </p>
      )}
      {outgoing && (
        <div role="status" className="rise-in flex items-center justify-between gap-3 rounded-[18px] bg-muted/70 px-4 py-3 dark:bg-muted/50">
          <span className="status-thinking font-medium">Waiting for {outgoing.player.nickname}…</span>
          <Button variant="outline" size="sm" className="min-h-10 rounded-[12px]" onClick={cancelChallenge}>
            Cancel
          </Button>
        </div>
      )}

      {pairs.length > 0 && (
        <Block title="Games in progress">
          {pairs.map((pair) => (
            <li key={pair.gameId} className="flex min-h-12 items-center justify-between gap-3 py-1.5">
              <span className="font-medium">
                {pair.players[0].nickname} vs {pair.players[1].nickname}
              </span>
              {!pair.players.some((p) => p.deviceId === self.deviceId) && (
                <Button variant="outline" size="sm" className="min-h-10 rounded-[12px]" onClick={() => watch(pair)}>
                  Watch
                </Button>
              )}
            </li>
          ))}
        </Block>
      )}

      <Block title="People">
        {[...members].sort((m, n) => Number(isYou(n)) - Number(isYou(m))).map((m) => (
          <li key={m.deviceId} className="flex min-h-12 items-center justify-between gap-3 py-1.5">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{isYou(m) ? 'You' : m.nickname}</span>
              <span className="text-sm text-muted-foreground">{STATUS_LABEL[m.status]}</span>
            </span>
            {!isYou(m) && (
              <Button size="sm" className="min-h-10 rounded-[12px] px-4" disabled={!canChallenge(m)} onClick={() => challenge(m)}>
                Challenge
              </Button>
            )}
          </li>
        ))}
      </Block>

      <Block title="Results" empty={results.length === 0 ? 'No series finished yet' : undefined}>
        {results.map((r) => (
          <li key={r.gameId} className="min-h-10 py-1.5 text-[15px]">
            {resultLine(r)}
          </li>
        ))}
      </Block>

      {challengeDialog}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>Everyone here goes back to the list, and its results are gone for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => void deleteRoom()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {vsSplash && (
        <Interstitial
          title={`${vsSplash.players[0].nickname} vs ${vsSplash.players[1].nickname}`}
          subtitle="A series to 6 is starting"
          actions={[
            { label: 'Watch', onClick: () => watch(vsSplash), primary: true },
            { label: 'Dismiss', onClick: () => setVsSplash(null) },
          ]}
        />
      )}
    </section>
  )
}

function Block({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-[18px] bg-muted/70 px-4 py-3 dark:bg-muted/50')}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {empty ? <p className="py-1 text-sm text-muted-foreground">{empty}</p> : <ul className="divide-y divide-border/60">{children}</ul>}
    </div>
  )
}
