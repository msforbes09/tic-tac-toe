import { useRef, type KeyboardEvent } from 'react'
import { Cell } from './Cell'
import type { Board as BoardModel, WinLine } from '@/lib/types'

export type BoardProps = {
  board: BoardModel
  winningLine: WinLine | null
  disabled: boolean
  onSelect: (index: number) => void
  /** Every tap, including on occupied or disabled cells (they let taps fall through). */
  onTap?: (index: number) => void
}

// Row and column step for each arrow key.
const STEPS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

export function Board({ board, winningLine, disabled, onSelect, onTap }: BoardProps) {
  const grid = useRef<HTMLDivElement>(null)

  // Arrow keys walk focus across the board, skipping taken cells and stopping at the edge.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEPS[event.key]
    if (!step || !grid.current) return
    const cells = Array.from(grid.current.querySelectorAll<HTMLButtonElement>('button'))
    const from = cells.indexOf(document.activeElement as HTMLButtonElement)
    if (from < 0) return
    event.preventDefault()
    let row = Math.floor(from / 3) + step[0]
    let col = (from % 3) + step[1]
    while (row >= 0 && row < 3 && col >= 0 && col < 3) {
      const target = cells[row * 3 + col]
      if (!target.disabled) {
        target.focus()
        return
      }
      row += step[0]
      col += step[1]
    }
  }

  return (
    <div className="board-tray rounded-[28px] bg-muted/70 p-[3.2cqw] dark:bg-muted/50">
      <div
        ref={grid}
        role="group"
        aria-label="Game board"
        onKeyDown={onKeyDown}
        className="board-grid grid w-full touch-manipulation grid-cols-3"
      >
        {board.map((value, index) => {
          const winOrder = winningLine ? winningLine.indexOf(index) : -1
          return (
            // The wrapper catches taps that a disabled cell lets through, for the developer knock.
            <div key={index} onClick={() => onTap?.(index)}>
              <Cell
                index={index}
                value={value}
                highlighted={winOrder >= 0}
                winOrder={Math.max(winOrder, 0)}
                disabled={disabled}
                onSelect={onSelect}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
