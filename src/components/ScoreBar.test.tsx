import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScoreBar } from './ScoreBar'

const score = { p1: 2, p2: 1, draws: 0 }
const label = (text: string) => screen.getByText(text, { selector: 'dt' })

describe('ScoreBar online', () => {
  it('reads You and Friend from the host', () => {
    render(<ScoreBar mode="online" score={score} p1Symbol="X" youSeat="p1" />)
    expect(label('You').nextElementSibling).toHaveTextContent('2')
    expect(label('Friend').nextElementSibling).toHaveTextContent('1')
  })

  it('reads You and Friend from the guest', () => {
    render(<ScoreBar mode="online" score={score} p1Symbol="X" youSeat="p2" />)
    expect(label('Friend').nextElementSibling).toHaveTextContent('2')
    expect(label('You').nextElementSibling).toHaveTextContent('1')
  })
})
