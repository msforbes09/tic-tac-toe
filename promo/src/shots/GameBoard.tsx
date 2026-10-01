import { Board } from "../components/Board"
import { Shot } from "../components/Shot"
import { ThinkingBadge } from "../components/ThinkingBadge"
import { type Layout, zones } from "../layout"
import { type Beats, MOVES, WIN } from "../timeline"

// The one board that runs through shots 1-3 unbroken: its tray fades in under the splash-out (from `from`),
// its tiles pop in at `tilesAt`, the bot thinks above it before each O; it slides out and down as shot 4
// comes in.
export function GameBoard({
  layout,
  from,
  tilesAt,
  to,
  thinking,
}: {
  layout: Layout
  from: number
  tilesAt: number
  to: number
  thinking: Beats["thinking"]
}) {
  return (
    <Shot from={from} to={to}>
      <Board box={zones(layout).board} trayAt={from} popAt={tilesAt} moves={MOVES} win={WIN} />
      {thinking.map(({ at, exit }) => (
        <ThinkingBadge key={at} layout={layout} at={at} exitAt={exit} />
      ))}
    </Shot>
  )
}
