import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnlineLobby } from './OnlineLobby'

const base = { code: 'AB2C', link: 'https://x.test/?room=AB2C', onCancel: () => {} }

describe('OnlineLobby', () => {
  it('shows the code, waits, and lets the host share', async () => {
    const share = vi.fn().mockResolvedValue('copied')
    render(<OnlineLobby {...base} role="host" status="waiting" share={share} />)
    expect(screen.getByText('AB2C')).toBeInTheDocument()
    expect(screen.getByText('Waiting for your friend…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    expect(share).toHaveBeenCalledWith('https://x.test/?room=AB2C')
    await waitFor(() => expect(screen.getByText('Link copied')).toBeInTheDocument())
  })

  it('tells the host when sharing failed', async () => {
    render(<OnlineLobby {...base} role="host" status="waiting" share={vi.fn().mockResolvedValue('failed')} />)
    fireEvent.click(screen.getByRole('button', { name: /share/i }))
    await waitFor(() => expect(screen.getByText(/couldn't share/i)).toBeInTheDocument())
  })

  it('the guest has no Share button and can cancel', () => {
    const onCancel = vi.fn()
    render(<OnlineLobby {...base} role="guest" status="waiting" share={vi.fn()} onCancel={onCancel} />)
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows connecting, full and error states with Back', () => {
    const { rerender } = render(<OnlineLobby {...base} role="guest" status="connecting" share={vi.fn()} />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
    rerender(<OnlineLobby {...base} role="guest" status="full" share={vi.fn()} />)
    expect(screen.getByText('Room is full')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    rerender(<OnlineLobby {...base} role="host" status="error" share={vi.fn()} />)
    expect(screen.getByText("Couldn't connect")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
  })
})
