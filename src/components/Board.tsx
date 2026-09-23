import { Cell } from './Cell'
import type { Board as BoardModel, WinLine } from '@/lib/types'

export type BoardProps = {
  board: BoardModel
  winningLine: WinLine | null
  disabled: boolean
  onSelect: (index: number) => void
}

export function Board({ board, winningLine, disabled, onSelect }: BoardProps) {
  return (
    <div className="board-tray rounded-[28px] bg-muted/70 p-[3.2cqw] dark:bg-muted/50">
      <div
        role="group"
        aria-label="Game board"
        className="board-grid grid w-full touch-manipulation grid-cols-3"
      >
        {board.map((value, index) => {
          const winOrder = winningLine ? winningLine.indexOf(index) : -1
          return (
            <Cell
              key={index}
              index={index}
              value={value}
              highlighted={winOrder >= 0}
              winOrder={Math.max(winOrder, 0)}
              disabled={disabled}
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </div>
  )
}
