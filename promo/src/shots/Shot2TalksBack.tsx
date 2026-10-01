import { boardGeometry } from "../components/Board"
import { Bubble } from "../components/Bubble"
import { Shot } from "../components/Shot"
import { type Layout, zones } from "../layout"
import { BOT_LINES } from "../script"

// Shot 2: the bot's first line in a bubble, its tail on the O in cell 0, popping as its voice starts.
export function Shot2TalksBack({
  layout,
  from,
  to,
  popAt,
  exitAt,
}: {
  layout: Layout
  from: number
  to: number
  popAt: number
  exitAt: number
}) {
  return (
    <Shot from={from} to={to}>
      <Bubble layout={layout} text={BOT_LINES["bot-01"]} popAt={popAt} exitAt={exitAt} tailX={tailX(layout)} breathe />
    </Shot>
  )
}

// The x of the O in cell 0, where both bubbles point.
export const tailX = (layout: Layout) => {
  const board = zones(layout).board
  return board.x + boardGeometry(board.w).centre(0).x
}
