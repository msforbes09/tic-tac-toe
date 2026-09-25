import * as icons from 'lucide-react'
import type { ComponentType, CSSProperties } from 'react'
import { TIER_COLOR, achievementById, isAchievementId } from '@/lib/achievements'
import { cn } from '@/lib/utils'

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties; 'aria-hidden'?: boolean }>
const ICONS = icons as unknown as Record<string, IconComponent | undefined>

/** An achievement's icon in its tier colour (or the current colour when dimmed). Nothing for an unknown id. */
export function AchievementIcon({ id, className, dimmed = false }: { id: string; className?: string; dimmed?: boolean }) {
  if (!isAchievementId(id)) return null
  const a = achievementById(id)
  const Icon = ICONS[a.icon] ?? icons.Award
  return <Icon aria-hidden className={cn('shrink-0', className)} style={dimmed ? undefined : { color: TIER_COLOR[a.tier] }} />
}

/** One unlocked achievement worn above a name online. Nothing for a missing or unknown id. */
export function AchievementBadge({ id, className }: { id?: string | null; className?: string }) {
  if (!id || !isAchievementId(id)) return null
  return (
    <span role="img" aria-label={achievementById(id).name} data-badge={id} className={cn('inline-flex', className)}>
      <AchievementIcon id={id} className="size-4" />
    </span>
  )
}
