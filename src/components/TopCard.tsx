import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ShareLink, ShareResult } from '@/platform/share'

/** The line that goes out with the site link when someone brags. */
export const TOP_SHARE_TEXT = 'I held the unbeatable tic-tac-toe bot to a draw. Your move.'

const SHARE_NOTE: Record<ShareResult, string> = {
  shared: '',
  copied: 'Copied. Paste it anywhere.',
  failed: "Couldn't share.",
}

/**
 * Shown once ever, over the board, the first time rung 30 is held to a draw. Only now does the
 * app admit the bot at the top cannot be beaten.
 */
export function TopCard({ share, siteUrl, onClose }: { share?: ShareLink; siteUrl?: string; onClose: () => void }) {
  const [note, setNote] = useState('')
  return (
    <div
      role="dialog"
      aria-labelledby="top-card-title"
      className="rise-in absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[24px] bg-background/95 p-5 text-center"
    >
      <p id="top-card-title" className="font-heading text-2xl font-semibold">
        That was the unbeatable bot.
      </p>
      <p className="text-muted-foreground">Holding it to a draw is as good as it gets.</p>
      <div className="flex w-full max-w-[280px] flex-col gap-2">
        {share && siteUrl && (
          <Button
            className="min-h-12 w-full rounded-[16px] text-base font-medium"
            onClick={() => void share(siteUrl, TOP_SHARE_TEXT).then((r) => setNote(SHARE_NOTE[r]))}
          >
            Share
          </Button>
        )}
        <Button variant="outline" className="min-h-12 w-full rounded-[16px] text-base" onClick={onClose}>
          Keep playing
        </Button>
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}
