import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ShareLink, ShareResult } from '@/platform/share'

/** The line that goes out with the site link when someone brags. */
export const TOP_SHARE_TEXT = 'I held the unbeatable tic-tac-toe bot to a draw. Your move.'

const SHARE_NOTE: Record<ShareResult, string> = {
  shared: '',
  copied: 'Copied. Paste it anywhere.',
  failed: "Couldn't share.",
}

/**
 * Shown once ever, in the middle of the screen, the first time rung 30 is held to a draw. Only now
 * does the app admit the bot at the top cannot be beaten. Modal: nothing behind it can be tapped.
 */
export function TopCard({ share, siteUrl, onClose }: { share?: ShareLink; siteUrl?: string; onClose: () => void }) {
  const [note, setNote] = useState('')
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[24px] text-center">
        <AlertDialogHeader className="items-center text-center">
          <AlertDialogTitle className="font-heading text-2xl font-semibold">That was the unbeatable bot.</AlertDialogTitle>
          <p className="text-muted-foreground">Holding it to a draw is as good as it gets.</p>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col">
          {share && siteUrl && (
            <AlertDialogAction
              className="min-h-12 w-full rounded-[16px] text-base font-medium"
              onClick={() => void share(siteUrl, TOP_SHARE_TEXT).then((r) => setNote(SHARE_NOTE[r]))}
            >
              Share
            </AlertDialogAction>
          )}
          <AlertDialogCancel className="min-h-12 w-full rounded-[16px] text-base">Keep playing</AlertDialogCancel>
        </AlertDialogFooter>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </AlertDialogContent>
    </AlertDialog>
  )
}
