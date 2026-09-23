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
    <div
      role="group"
      aria-label="Game board"
      className="grid w-full touch-manipulation grid-cols-3 gap-2"
    >
      {board.map((value, index) => (
        <Cell
          key={index}
          index={index}
          value={value}
          highlighted={winningLine?.includes(index) ?? false}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
