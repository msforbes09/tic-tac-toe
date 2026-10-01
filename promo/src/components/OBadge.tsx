import type { CSSProperties } from "react"
import { COLOR } from "../tokens"

// The bot's badge: an O ring on a tile-coloured disc, as the app shows beside the bot's name.
export function OBadge({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <circle cx={50} cy={50} r={46} fill={COLOR.tile} />
      <circle cx={50} cy={50} r={24} fill="none" stroke={COLOR.o} strokeWidth={11} />
    </svg>
  )
}
