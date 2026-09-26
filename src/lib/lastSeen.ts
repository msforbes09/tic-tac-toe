const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** How long ago a player was last seen, for developer mode's player list. */
export function lastSeenLabel(at: number, now: number): string {
  const ago = now - at
  if (ago < MIN) return 'just now'
  if (ago < HOUR) return `${Math.floor(ago / MIN)} min ago`
  if (ago < DAY) return `${Math.floor(ago / HOUR)} h ago`
  const days = Math.floor(ago / DAY)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}
