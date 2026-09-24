import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Role } from '@/lib/room'
import type { ShareLink, ShareResult } from '@/platform/share'
import { cn } from '@/lib/utils'

export type LobbyStatus = 'connecting' | 'waiting' | 'full' | 'error'

export type OnlineLobbyProps = {
  code: string
  role: Role
  status: LobbyStatus
  link: string
  share: ShareLink
  onCancel: () => void
}

const STATUS_TEXT: Record<LobbyStatus, string> = {
  connecting: 'Connecting…',
  waiting: 'Waiting for your friend…',
  full: 'Room is full',
  error: "Couldn't connect",
}

const SHARE_NOTE: Record<ShareResult, string> = {
  shared: '',
  copied: 'Link copied',
  failed: "Couldn't share. Read the code aloud instead.",
}

export function OnlineLobby({ code, role, status, link, share, onCancel }: OnlineLobbyProps) {
  const [note, setNote] = useState('')
  const canShare = role === 'host' && status === 'waiting'
  const settled = status === 'full' || status === 'error'

  return (
    <section className="flex flex-1 flex-col gap-8">
      <header className="flex items-center">
        <Button variant="ghost" size="sm" onClick={onCancel} className="-ml-2 min-h-11 rounded-xl px-2.5 text-[15px]">
          ← Back
        </Button>
      </header>

      <div className="my-auto flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Room code</p>
        <p aria-label="Room code" className="text-[4rem] font-bold leading-none tracking-[0.25em]">
          {code}
        </p>
        <p
          aria-live="polite"
          className={cn(
            'text-lg font-semibold',
            settled ? 'text-foreground' : 'text-muted-foreground',
            status === 'waiting' && 'status-thinking',
          )}
        >
          {STATUS_TEXT[status]}
        </p>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {canShare && (
          <Button
            size="lg"
            className="min-h-14 w-full rounded-[18px] text-base font-semibold"
            onClick={() => {
              void share(link).then((result) => setNote(SHARE_NOTE[result]))
            }}
          >
            Share
          </Button>
        )}
        <Button
          size="lg"
          variant={canShare ? 'outline' : 'default'}
          className="min-h-14 w-full rounded-[18px] text-base font-semibold"
          onClick={onCancel}
        >
          {settled ? 'Back' : 'Cancel'}
        </Button>
      </div>
    </section>
  )
}
