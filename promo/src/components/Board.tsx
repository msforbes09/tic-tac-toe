import { interpolate, interpolateColors, useCurrentFrame } from "remotion"
import type { Box } from "../layout"
import { enter, pop } from "../motion"
import type { Move, WIN } from "../timeline"
import { COLOR } from "../tokens"
import { Mark } from "./Mark"

type Win = typeof WIN

const PULSE_FRAMES = 19 // the app's 620 ms tile-win
const WIN_STAGGER = 3 // the app's 90 ms --win-delay per winning tile, in order
const HIGHLIGHT_FRAMES = 5 // the app's 150 ms background transition
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

// A winning X tile as the app draws it (src/components/Cell.tsx): tinted --player-x-soft with a
// --player-x ring at 60%, and the tile-win pulse; `order` staggers the tiles along the line.
export function winTile(
  frame: number,
  at: number,
  order: number,
  tile: number,
): { background: string; boxShadow: string; transform: string } {
  const from = at + order * WIN_STAGGER
  const lit = enter(frame, from, HIGHLIGHT_FRAMES)
  const pulse = interpolate(
    frame,
    [from, from + PULSE_FRAMES * 0.4, from + PULSE_FRAMES],
    [1, 1.055, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  )
  // The app's 2 px ring on a phone-sized tile, scaled to this tile.
  const ring = Math.max(2, tile * 0.018)
  return {
    background: interpolateColors(lit, [0, 1], [COLOR.tile, COLOR.xSoft]),
    boxShadow: `0 0 0 ${ring}px rgba(143, 168, 255, ${0.6 * lit})`, // --player-x at 60%
    transform: `scale(${pulse})`,
  }
}

// The nine-tile board. Tiles pop in from `popAt` with a 3-frame stagger; marks draw at their frames; a win
// lights and pulses its tiles, as the app does.
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
  const { tile, centre } = boardGeometry(box.w)

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
        const order = win ? win.cells.indexOf(cell) : -1
        const winning = win && order >= 0 ? winTile(frame, win.at, order, tile) : undefined
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
              ...winning,
              transform: `${tilePop.transform} ${winning?.transform ?? ""}`,
            }}
          >
            {move && <Mark player={move.player} at={move.at} size={tile} />}
          </div>
        )
      })}
    </div>
  )
}
