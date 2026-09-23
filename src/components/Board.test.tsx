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
