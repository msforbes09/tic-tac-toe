import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnlinePanel, type OnlinePanelProps } from './OnlinePanel'

const rooms = [
  { id: 'r2', name: 'Bold Corner', creatorId: 'b', createdAt: 2 },
  { id: 'r1', name: 'Sly Diagonal', creatorId: 'a', createdAt: 1 },
]

function props(over: Partial<OnlinePanelProps> = {}): OnlinePanelProps {
  return {
    nickname: 'Alice',
    suggestedNickname: 'Quiet Edge',
    onSaveNickname: vi.fn(),
    rooms,
    counts: { r1: 3 },
    ownedRoomId: null,
    onCreate: vi.fn(),
    onEnter: vi.fn(),
    ...over,
  }
}

describe('OnlinePanel', () => {
  it('asks for a nickname when there is none, prefilled with the suggestion', () => {
    const p = props({ nickname: null })
    render(<OnlinePanel {...p} />)
    expect(screen.getByRole('textbox', { name: /nickname/i })).toHaveValue('Quiet Edge')
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(p.onSaveNickname).toHaveBeenCalledWith('Quiet Edge')
  })

  it('shows who you are and lets you edit it', () => {
    render(<OnlinePanel {...props()} />)
    expect(screen.queryByRole('textbox', { name: /nickname/i })).not.toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /edit nickname/i }))
    expect(screen.getByRole('textbox', { name: /nickname/i })).toHaveValue('Alice')
  })

  it('lists rooms with live counts and enters one on tap', () => {
    const p = props()
    render(<OnlinePanel {...p} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Bold Corner')
    expect(items[0]).toHaveTextContent('Empty')
    expect(items[1]).toHaveTextContent('Sly Diagonal')
    expect(items[1]).toHaveTextContent('3 in room')
    fireEvent.click(screen.getByRole('button', { name: /sly diagonal/i }))
    expect(p.onEnter).toHaveBeenCalledWith(rooms[1])
  })

  it('marks the room you own', () => {
    render(<OnlinePanel {...props({ ownedRoomId: 'r1' })} />)
    expect(screen.getByRole('button', { name: /sly diagonal/i })).toHaveTextContent('Your room')
    expect(screen.getByRole('button', { name: /bold corner/i })).not.toHaveTextContent('Your room')
  })

  it('says the rooms are loading until the list has been read once', () => {
    render(<OnlinePanel {...props({ rooms: null })} />)
    expect(screen.getByText('Loading rooms…')).toBeInTheDocument()
    expect(screen.queryByText('No open rooms yet. Create one!')).not.toBeInTheDocument()
  })

  it('shows the empty state and creates a room', () => {
    const p = props({ rooms: [] })
    render(<OnlinePanel {...p} />)
    expect(screen.getByText('No open rooms yet. Create one!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    expect(p.onCreate).toHaveBeenCalledTimes(1)
  })
})
