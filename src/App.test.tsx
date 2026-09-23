import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the game title on the setup screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  })

  it('starts a game and returns to setup', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(screen.getByText("X's turn")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument()
  })

  it('opens the history sheet', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /history/i }))
    expect(screen.getByText(/no games yet/i)).toBeInTheDocument()
  })
})
