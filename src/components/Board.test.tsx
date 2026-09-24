import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Board } from './Board'
import type { Board as BoardModel } from '@/lib/types'

const b = (s: string): BoardModel =>
  s.split('').map((c) => (c === '.' ? null : (c as 'X' | 'O')))

describe('Board', () => {
  it('renders nine cells with accessible labels', () => {
    render(<Board board={b('X.O......')} winningLine={null} disabled={false} onSelect={() => {}} />)
    const cells = screen.getAllByRole('button', { name: /^Cell \d/ })
    expect(cells).toHaveLength(9)
    expect(screen.getByRole('button', { name: 'Cell 1, X' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cell 2, empty' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cell 3, O' })).toBeInTheDocument()
  })

  it('calls onSelect with the cell index when an empty cell is tapped', () => {
    const onSelect = vi.fn()
    render(<Board board={b('.........')} winningLine={null} disabled={false} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cell 5, empty' }))
    expect(onSelect).toHaveBeenCalledWith(4)
  })

  it('reports every tap through onTap, including taps on occupied cells', () => {
    const onSelect = vi.fn()
    const onTap = vi.fn()
    render(<Board board={b('X........')} winningLine={null} disabled={false} onSelect={onSelect} onTap={onTap} />)
    // A disabled button lets the tap fall through to its wrapper (pointer-events: none).
    fireEvent.click(screen.getByRole('button', { name: 'Cell 1, X' }).parentElement!)
    expect(onTap).toHaveBeenCalledWith(0)
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cell 5, empty' }))
    expect(onTap).toHaveBeenCalledWith(4)
    expect(onSelect).toHaveBeenCalledWith(4)
  })

  it('disables occupied cells', () => {
    render(<Board board={b('X........')} winningLine={null} disabled={false} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'Cell 1, X' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cell 2, empty' })).toBeEnabled()
  })

  it('disables every cell when the board is disabled', () => {
    render(<Board board={b('.........')} winningLine={null} disabled={true} onSelect={() => {}} />)
    for (const cell of screen.getAllByRole('button')) expect(cell).toBeDisabled()
  })

  it('marks the winning cells as highlighted', () => {
    render(<Board board={b('XXXOO....')} winningLine={[0, 1, 2]} disabled={true} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'Cell 1, X' })).toHaveAttribute('data-highlighted', 'true')
    expect(screen.getByRole('button', { name: 'Cell 4, O' })).not.toHaveAttribute('data-highlighted', 'true')
  })
})

describe('Board keyboard navigation', () => {
  const cellAt = (n: number) => screen.getByRole('button', { name: new RegExp(`^Cell ${n},`) })
  const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key })
  const renderBoard = (s = '.........') =>
    render(<Board board={b(s)} winningLine={null} disabled={false} onSelect={() => {}} />)

  it('moves focus with the arrow keys', () => {
    renderBoard()
    cellAt(5).focus()
    press('ArrowRight')
    expect(cellAt(6)).toHaveFocus()
    press('ArrowDown')
    expect(cellAt(9)).toHaveFocus()
    press('ArrowLeft')
    expect(cellAt(8)).toHaveFocus()
    press('ArrowUp')
    expect(cellAt(5)).toHaveFocus()
  })

  it('stays put at the edge of the board', () => {
    renderBoard()
    cellAt(1).focus()
    press('ArrowLeft')
    expect(cellAt(1)).toHaveFocus()
    press('ArrowUp')
    expect(cellAt(1)).toHaveFocus()
  })

  it('skips over taken cells', () => {
    renderBoard('....X....')
    cellAt(4).focus()
    press('ArrowRight')
    expect(cellAt(6)).toHaveFocus()
  })

  it('stays put when every cell that way is taken', () => {
    renderBoard('....XO...')
    cellAt(4).focus()
    press('ArrowRight')
    expect(cellAt(4)).toHaveFocus()
  })

  it('places a mark with Enter on the focused cell', () => {
    const onSelect = vi.fn()
    render(<Board board={b('.........')} winningLine={null} disabled={false} onSelect={onSelect} />)
    cellAt(1).focus()
    fireEvent.keyDown(cellAt(1), { key: 'ArrowRight' })
    fireEvent.click(document.activeElement as Element)
    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
