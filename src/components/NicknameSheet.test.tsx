import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NicknameSheet } from './NicknameSheet'

describe('NicknameSheet', () => {
  it('prefills the random name and saves a normalized edit', () => {
    const onSave = vi.fn()
    render(<NicknameSheet open initial="Sly Diagonal" onSave={onSave} />)
    const input = screen.getByRole('textbox', { name: /nickname/i })
    expect(input).toHaveValue('Sly Diagonal')
    fireEvent.change(input, { target: { value: '  Bob  ' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith('Bob')
  })

  it('falls back to the random name when the edit is too short', () => {
    const onSave = vi.fn()
    render(<NicknameSheet open initial="Sly Diagonal" onSave={onSave} />)
    fireEvent.change(screen.getByRole('textbox', { name: /nickname/i }), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith('Sly Diagonal')
  })

  it('saves on Enter too and renders nothing when closed', () => {
    const onSave = vi.fn()
    const view = render(<NicknameSheet open initial="Sly Diagonal" onSave={onSave} />)
    fireEvent.keyDown(screen.getByRole('textbox', { name: /nickname/i }), { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('Sly Diagonal')
    view.rerender(<NicknameSheet open={false} initial="Sly Diagonal" onSave={onSave} />)
    expect(screen.queryByRole('textbox', { name: /nickname/i })).not.toBeInTheDocument()
  })
})
