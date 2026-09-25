import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('has no developer section unless developer mode is on', () => {
    render(<SettingsSheet {...base} />)
    expect(screen.queryByText('Developer')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: 'Rung' })).not.toBeInTheDocument()
  })

  describe('developer section', () => {
    const dev = () => ({ rung: 17, onSetRung: vi.fn(), onReset: vi.fn(), onExit: vi.fn() })

    it('sets the rung and closes', () => {
      const d = dev()
      const onOpenChange = vi.fn()
      render(<SettingsSheet {...base} dev={d} onOpenChange={onOpenChange} />)
      expect(screen.getByText('Developer')).toBeInTheDocument()
      const field = screen.getByRole('spinbutton', { name: 'Rung' })
      expect(field).toHaveValue(17)
      fireEvent.change(field, { target: { value: '29' } })
      fireEvent.click(screen.getByRole('button', { name: 'Set' }))
      expect(d.onSetRung).toHaveBeenCalledWith(29)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('refuses a rung outside 1 to 30', () => {
      const d = dev()
      render(<SettingsSheet {...base} dev={d} />)
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Rung' }), { target: { value: '31' } })
      expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled()
    })

    it('resets game data on the second tap and closes', () => {
      const d = dev()
      const onOpenChange = vi.fn()
      render(<SettingsSheet {...base} dev={d} onOpenChange={onOpenChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Reset game data' }))
      expect(d.onReset).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Tap again to confirm' }))
      expect(d.onReset).toHaveBeenCalledTimes(1)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('exits developer mode and closes', () => {
      const d = dev()
      const onOpenChange = vi.fn()
      render(<SettingsSheet {...base} dev={d} onOpenChange={onOpenChange} />)
      fireEvent.click(screen.getByRole('button', { name: 'Exit developer mode' }))
      expect(d.onExit).toHaveBeenCalledTimes(1)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('install', () => {
    it('offers Install when the browser can prompt', () => {
      const onInstall = vi.fn()
      render(<SettingsSheet {...base} install={{ kind: 'prompt', onInstall }} />)
      expect(screen.getByText('Add to Home Screen')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
      expect(onInstall).toHaveBeenCalledTimes(1)
    })

    it('explains the Share steps on iPhone instead of an Install button', () => {
      render(<SettingsSheet {...base} install={{ kind: 'ios-steps', onInstall: () => {} }} />)
      expect(screen.getByText('Add to Home Screen')).toBeInTheDocument()
      expect(screen.getByText(/share/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
    })

    it('has no install section once installed', () => {
      render(<SettingsSheet {...base} />)
      expect(screen.queryByText('Add to Home Screen')).not.toBeInTheDocument()
    })
  })

  it('closes from the floating Back; there is no Done and no cross', () => {
    const onOpenChange = vi.fn()
    render(<SettingsSheet {...base} onOpenChange={onOpenChange} />)
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })

  it('lets the player pick a badge from the unlocked ones or none', () => {
    const onChange = vi.fn()
    render(<SettingsSheet {...base} badge={{ unlocks: { 'hello-bot': 1, closer: 2 }, worn: 'closer', onChange }} />)
    const group = screen.getByRole('radiogroup', { name: 'Badge' })
    expect(within(group).getByRole('radio', { name: 'Closer' })).toHaveAttribute('aria-checked', 'true')
    expect(within(group).getByRole('radio', { name: 'Hello, Bot' })).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(within(group).getByRole('radio', { name: 'Hello, Bot' }))
    expect(onChange).toHaveBeenCalledWith('hello-bot')
    fireEvent.click(within(group).getByRole('radio', { name: 'None' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('says how to earn a badge when nothing is unlocked', () => {
    render(<SettingsSheet {...base} badge={{ unlocks: {}, worn: null, onChange: vi.fn() }} />)
    expect(screen.getByText('Unlock an achievement to wear a badge')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})
