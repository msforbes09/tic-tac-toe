import { useCurrentFrame } from "remotion"
import { Column, heading, Shot, text } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { rise } from "../motion"

const TITLE_AT = 12
const LEAVE_AT = 108 // 3.6 s

// Shot 1: the title and "You learned it on a napkin." over the empty board (the board is GameBoard).
export function Shot1Board({ layout, to, sublineAt }: { layout: Layout; to: number; sublineAt: number }) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  return (
    <Shot from={0} to={to}>
      <Column box={zones(layout).title} gap={type.subline * 0.2}>
        <div style={{ ...heading(type.title), letterSpacing: "-0.01em", ...rise(frame, TITLE_AT, LEAVE_AT) }}>
          Tic-Tac-Toe
        </div>
        <div style={{ ...text(type.subline), ...rise(frame, sublineAt, LEAVE_AT) }}>
          You learned it on a napkin.
        </div>
      </Column>
    </Shot>
  )
}
