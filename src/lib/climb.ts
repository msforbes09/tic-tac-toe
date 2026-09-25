/** How many recent bot games the History graph draws. */
export const CLIMB_LENGTH = 30

/**
 * The rungs of the most recent bot games, oldest first, for the climb graph in History. Games
 * without a rung (recorded before the ladder existed) are left out.
 */
export function climbSeries(games: { at: number; rung: number | null }[]): number[] {
  return games
    .filter((g): g is { at: number; rung: number } => g.rung !== null)
    .sort((a, b) => a.at - b.at)
    .slice(-CLIMB_LENGTH)
    .map((g) => g.rung)
}
