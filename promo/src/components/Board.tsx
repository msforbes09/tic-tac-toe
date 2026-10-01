import { interpolate, useCurrentFrame } from "remotion"
import type { Box } from "../layout"
import { enter, pop } from "../motion"
import type { Move } from "../timeline"
import { COLOR } from "../tokens"
import { Mark } from "./Mark"

type Win = { cells: number[]; at: number }

const STRIKE_FRAMES = 15
const PULSE_FRAMES = 19
const TILE_STAGGER = 3

// Tray, gutter and tile sizes for a board of width `size` (gutter 2.5% of the width, as the app).
export function boardGeometry(size: number) {
  const gap = size * 0.025
  const tile = (size - 4 * gap) / 3
  const centre = (cell: number) => ({
    x: gap + (cell % 3) * (tile + gap) + tile / 2,
    y: gap + Math.floor(cell / 3) * (tile + gap) + tile / 2,
  })
  return { gap, tile, centre }
}

// The nine-tile board. Tiles pop in from `popAt` with a 3-frame stagger; marks draw at their frames; a win
// draws its strike line and pulses its tiles once.
export function Board({
  box,
  popAt,
  moves,
  win,
}: {
  box: Box
  popAt: number
  moves: Move[]
  win?: Win
}) {
  const frame = useCurrentFrame()
  const { gap, tile, centre } = boardGeometry(box.w)
  const pulse = (cell: number) =>
    win?.cells.includes(cell)
      ? interpolate(
          frame,
          [win.at, win.at + PULSE_FRAMES / 2, win.at + PULSE_FRAMES],
          [1, 1.055, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        )
      : 1

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        background: COLOR.tray,
        borderRadius: box.w * 0.06,
      }}
    >
      {Array.from({ length: 9 }, (_, cell) => {
        const { x, y } = centre(cell)
        const move = moves.find((m) => m.cell === cell && frame >= m.at)
        const tilePop = pop(frame, popAt + cell * TILE_STAGGER)
        return (
          <div
            key={cell}
            style={{
              position: "absolute",
              left: x - tile / 2,
              top: y - tile / 2,
              width: tile,
              height: tile,
              borderRadius: tile * 0.14,
              background: COLOR.tile,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: tilePop.opacity,
              transform: `${tilePop.transform} scale(${pulse(cell)})`,
            }}
          >
            {move && <Mark player={move.player} at={move.at} size={tile} />}
          </div>
        )
      })}
      {win && (
        <Strike
          from={centre(win.cells[0])}
          to={centre(win.cells[2])}
          at={win.at}
          width={gap * 1.6}
          size={box.w}
        />
      )}
    </div>
  )
}

function Strike({
  from,
  to,
  at,
  width,
  size,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  at: number
  width: number
  size: number
}) {
  const frame = useCurrentFrame()
  // Run the line a little past the outer tiles' centres, as the app's strike does.
  const reach = 0.18
  const x1 = from.x - (to.x - from.x) * reach
  const y1 = from.y - (to.y - from.y) * reach
  const x2 = to.x + (to.x - from.x) * reach
  const y2 = to.y + (to.y - from.y) * reach
  return (
    <svg width={size} height={size} style={{ position: "absolute", left: 0, top: 0 }}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLOR.x}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - enter(frame, at, STRIKE_FRAMES)}
      />
    </svg>
  )
}
