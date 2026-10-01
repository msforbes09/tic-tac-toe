import { Bubble } from "../components/Bubble"
import { Confetti } from "../components/Confetti"
import { Shot } from "../components/Shot"
import { Toast } from "../components/Toast"
import { type Layout, zones } from "../layout"
import { BOT_LINES } from "../script"
import { WIN } from "../timeline"
import { tailX } from "./Shot2TalksBack"

const TOAST_EXIT = 316

// Shot 3: X takes the diagonal on the board (GameBoard draws the moves), confetti bursts, the bot
// shrugs it off, and the achievement toast drops in.
export function Shot3YouWin({
  layout,
  from,
  to,
  bubbleAt,
  bubbleExit,
  toastAt,
}: {
  layout: Layout
  from: number
  to: number
  bubbleAt: number
  bubbleExit: number
  toastAt: number
}) {
  const board = zones(layout).board
  return (
    <Shot from={from} to={to}>
      <Confetti x={board.x + board.w / 2} y={board.y + board.h / 2} at={WIN.at} spread={board.w * 0.6} />
      <Bubble layout={layout} text={BOT_LINES["bot-02"]} popAt={bubbleAt} exitAt={bubbleExit} tailX={tailX(layout)} />
      <Toast layout={layout} at={toastAt} exitAt={TOAST_EXIT} />
    </Shot>
  )
}
