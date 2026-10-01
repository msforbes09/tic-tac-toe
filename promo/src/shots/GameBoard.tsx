import { Board } from "../components/Board"
import { Shot } from "../components/Shot"
import { ThinkingBadge } from "../components/ThinkingBadge"
import { type Layout, zones } from "../layout"
import { MOVES, WIN } from "../timeline"

const TILES_AFTER = 3 // the tiles pop under the splash-out

// The one board that runs through shots 1-3 unbroken, the bot thinking above it before each O, then
// slides out and down as shot 4 comes in.
export function GameBoard({
  layout,
  from,
  to,
  thinking,
}: {
  layout: Layout
  from: number
  to: number
  thinking: number[]
}) {
  const answers = MOVES.filter((m) => m.player === "O")
  return (
    <Shot from={from} to={to}>
      <Board box={zones(layout).board} popAt={from + TILES_AFTER} moves={MOVES} win={WIN} />
      {thinking.map((at, i) => (
        <ThinkingBadge key={at} layout={layout} at={at} exitAt={answers[i].at} />
      ))}
    </Shot>
  )
}
