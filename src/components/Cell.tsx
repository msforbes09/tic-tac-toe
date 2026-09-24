import type { CSSProperties } from 'react'
import { Mark } from './Mark'
import { cn } from '@/lib/utils'
import type { Cell as CellValue } from '@/lib/types'

export type CellProps = {
  index: number
  value: CellValue
  highlighted: boolean
  disabled: boolean
  onSelect: (index: number) => void
  /** Position of this cell in the winning line (0–2); staggers the win pulse. */
  winOrder?: number
}

export function Cell({ index, value, highlighted, disabled, onSelect, winOrder = 0 }: CellProps) {
  const label = `Cell ${index + 1}, ${value ?? 'empty'}`
  const player = value === 'X' ? 'x' : value === 'O' ? 'o' : null

  return (
    <button
      type="button"
      aria-label={label}
      data-highlighted={highlighted ? 'true' : undefined}
      data-player={player ?? undefined}
      disabled={disabled || value !== null}
      onClick={() => onSelect(index)}
      style={{ '--win-delay': `${winOrder * 90}ms` } as CSSProperties}
      className={cn(
        'relative flex aspect-square min-h-11 w-full select-none items-center justify-center overflow-hidden rounded-[22%] border border-[var(--tile-edge)] bg-card text-card-foreground',
        'shadow-[0_1px_0_0_var(--tile-edge),0_6px_18px_-12px_var(--tile-shadow)]',
        'transition-[transform,background-color,box-shadow] duration-150 ease-out',
        'active:scale-[0.96] active:shadow-[0_0_0_0_var(--tile-edge),0_2px_8px_-8px_var(--tile-shadow)]',
        // Disabled cells let taps through to the board, which listens for the developer knock.
        'disabled:pointer-events-none disabled:active:scale-100 disabled:active:shadow-[0_1px_0_0_var(--tile-edge),0_6px_18px_-12px_var(--tile-shadow)]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60',
        value !== null && 'tile-pop',
        value === 'X' && 'text-player-x',
        value === 'O' && 'text-player-o',
        highlighted && 'tile-win',
        highlighted && value === 'X' && 'bg-player-x-soft ring-2 ring-player-x/60',
        highlighted && value === 'O' && 'bg-player-o-soft ring-2 ring-player-o/60',
      )}
    >
      {value !== null && <Mark player={value} animate weight={13} className="h-[56%] w-[56%]" />}
    </button>
  )
}
