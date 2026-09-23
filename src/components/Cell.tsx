import { cn } from '@/lib/utils'
import type { Cell as CellValue } from '@/lib/types'

export type CellProps = {
  index: number
  value: CellValue
  highlighted: boolean
  disabled: boolean
  onSelect: (index: number) => void
}

export function Cell({ index, value, highlighted, disabled, onSelect }: CellProps) {
  const label = `Cell ${index + 1}, ${value ?? 'empty'}`
  return (
    <button
      type="button"
      aria-label={label}
      data-highlighted={highlighted ? 'true' : undefined}
      disabled={disabled || value !== null}
      onClick={() => onSelect(index)}
      className={cn(
        'flex aspect-square min-h-11 w-full select-none items-center justify-center rounded-2xl border bg-card text-5xl font-bold text-card-foreground',
        'transition-transform duration-100 active:scale-95 disabled:active:scale-100',
        value === 'X' && 'text-primary',
        value === 'O' && 'text-destructive',
        highlighted && 'border-primary bg-primary text-primary-foreground',
        value === null && !disabled && 'focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {value}
    </button>
  )
}
