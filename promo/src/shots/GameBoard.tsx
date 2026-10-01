import { Board } from "../components/Board"
import { Shot } from "../components/Shot"
import { type Layout, zones } from "../layout"
import { MOVES, WIN } from "../timeline"

const TILES_AT = 6

// The one board that runs through shots 1-3 unbroken, then slides out and down as shot 4 comes in.
export function GameBoard({ layout, to }: { layout: Layout; to: number }) {
  return (
    <Shot from={0} to={to}>
      <Board box={zones(layout).board} popAt={TILES_AT} moves={MOVES} win={WIN} />
    </Shot>
  )
}
