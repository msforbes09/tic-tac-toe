import { useEffect } from 'react'
import { AchievementIcon } from './AchievementBadge'
import { achievementById, type AchievementId } from '@/lib/achievements'
import type { Feedback } from '@/lib/feedback'

/** How long one unlock stays up before the next one, or nothing, takes its place. */
export const TOAST_MS = 3000

/**
 * PlayStation-style: one unlock at a time at the top of the screen. The queue's head is shown; the
 * owner pops it through onDone after the delay or a tap. The chime plays once per unlock.
 */
export function AchievementToast({ queue, onDone, feedback }: { queue: AchievementId[]; onDone: () => void; feedback: Feedback }) {
  const id = queue[0]
  useEffect(() => {
    if (!id) return
    feedback.play({ kind: 'achievement' })
    const t = setTimeout(onDone, TOAST_MS)
    return () => clearTimeout(t)
  }, [id, feedback, onDone])
  if (!id) return null
  const a = achievementById(id)
  return (
    <div
      key={id}
      role="status"
      aria-label={`Achievement unlocked: ${a.name}`}
      onClick={onDone}
      className="toast-in room-follow fixed inset-x-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-[388px] cursor-pointer items-center gap-3 rounded-[18px] border border-border bg-card px-4 py-3 shadow-lg"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <AchievementIcon id={id} className="size-7" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Achievement unlocked</span>
        <span className="truncate font-heading text-[15px] font-semibold">{a.name}</span>
      </span>
    </div>
  )
}
