import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsSheet } from './SettingsSheet'

const base = {
  open: true,
  onOpenChange: () => {},
  nickname: 'Alice' as string | null,
  suggestedNickname: 'Sly Diagonal',
  onSaveNickname: () => {},
  tone: 'friendly' as const,
  onToneChange: () => {},
}

describe('SettingsSheet', () => {
  it('shows the current nickname and saves a valid edit', () => {
    const onSaveNickname = vi.fn()
    render(<SettingsSheet {...base} onSaveNickname={onSaveNickname} />)
    const field = screen.getByRole('textbox', { name: 'Nickname' })
    expect(field).toHaveValue('Alice')
    fireEvent.change(field, { target: { value: 'Bob 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSaveNickname).toHaveBeenCalledWith('Bob 2')
  })

  it('prefills the suggestion when there is no nickname yet and keeps it on an empty save', () => {
    const onSaveNickname = vi.fn()
    render(<SettingsSheet {...base} nickname={null} onSaveNickname={onSaveNickname} />)
    const field = screen.getByRole('textbox', { name: 'Nickname' })
    expect(field).toHaveValue('Sly Diagonal')
    fireEvent.change(field, { target: { value: ' ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSaveNickname).toHaveBeenCalledWith('Sly Diagonal')
  })

  it('filters the nickname as typed', () => {
    render(<SettingsSheet {...base} />)
    const field = screen.getByRole('textbox', { name: 'Nickname' })
    fireEvent.change(field, { target: { value: 'a!b@c' } })
    expect(field).toHaveValue('abc')
  })

  it('has an Aggressive bot switch that is off for friendly and turns cocky on', () => {
    const onToneChange = vi.fn()
    render(<SettingsSheet {...base} onToneChange={onToneChange} />)
    const toggle = screen.getByRole('switch', { name: 'Aggressive bot' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    expect(onToneChange).toHaveBeenCalledWith('cocky')
  })

  it('shows the switch on for cocky and turns friendly off', () => {
    const onToneChange = vi.fn()
    render(<SettingsSheet {...base} tone="cocky" onToneChange={onToneChange} />)
    const toggle = screen.getByRole('switch', { name: 'Aggressive bot' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle)
    expect(onToneChange).toHaveBeenCalledWith('friendly')
  })

  it('closes from Done', () => {
    const onOpenChange = vi.fn()
    render(<SettingsSheet {...base} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
