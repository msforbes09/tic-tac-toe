import { NicknameSheet } from './NicknameSheet'
import { Button } from '@/components/ui/button'
import type { RoomRecord } from '@/lib/roomDirectory'
import { cn } from '@/lib/utils'

export type OnlinePanelProps = {
  nickname: string | null
  /** The random themed name offered when there is no nickname yet. */
  suggestedNickname: string
  onSaveNickname: (name: string) => void
  /** Null until the list has been read once. */
  rooms: RoomRecord[] | null
  /** roomId → members present right now, from lobby presence. */
  counts: Record<string, number>
  ownedRoomId: string | null
  onCreate: () => void
  onEnter: (room: RoomRecord) => void
}

const countLabel = (n: number | undefined) => (!n ? 'Empty' : n === 1 ? '1 in room' : `${n} in room`)

/** Under the mode toggle when Online is picked: who you are, Create room, and the live list of rooms. */
export function OnlinePanel({ nickname, suggestedNickname, onSaveNickname, rooms, counts, ownedRoomId, onCreate, onEnter }: OnlinePanelProps) {
  return (
    <div className="rise-in flex flex-col gap-4">
      <span className="px-1 text-sm text-muted-foreground">
        Playing as <span className="font-semibold text-foreground">{nickname ?? suggestedNickname}</span>
      </span>

      <Button size="lg" className="min-h-14 w-full rounded-[18px] text-base font-semibold" onClick={onCreate}>
        Create room
      </Button>

      {rooms === null ? (
        <p className="py-6 text-center text-muted-foreground">Loading rooms…</p>
      ) : rooms.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">No open rooms yet. Create one!</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) => {
            const mine = room.id === ownedRoomId
            return (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => onEnter(room)}
                  className={cn(
                    'flex min-h-14 w-full items-center justify-between gap-3 rounded-[18px] bg-muted/70 px-4 text-left',
                    'transition-colors active:bg-muted dark:bg-muted/50',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold">{room.name}</span>
                    <span className="text-sm text-muted-foreground">{countLabel(counts[room.id])}</span>
                  </span>
                  {mine && <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-xs font-medium">Your room</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <NicknameSheet open={nickname === null} initial={nickname ?? suggestedNickname} onSave={onSaveNickname} />
    </div>
  )
}
