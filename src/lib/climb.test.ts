import { describe, expect, it } from 'vitest'
import { CLIMB_LENGTH, climbSeries } from './climb'

const game = (at: number, rung: number | null) => ({ at, rung })

describe('climbSeries', () => {
  it('lists rungs oldest first', () => {
    expect(climbSeries([game(3, 12), game(1, 10), game(2, 11)])).toEqual([10, 11, 12])
  })

  it('skips games without a rung', () => {
    expect(climbSeries([game(1, 10), game(2, null), game(3, 12)])).toEqual([10, 12])
  })

  it('keeps only the most recent games', () => {
    const games = Array.from({ length: CLIMB_LENGTH + 5 }, (_, i) => game(i, (i % 30) + 1))
    const series = climbSeries(games)
    expect(series).toHaveLength(CLIMB_LENGTH)
    expect(series.at(-1)).toBe((CLIMB_LENGTH + 4) % 30 + 1)
  })

  it('shows thirty games at most', () => {
    expect(CLIMB_LENGTH).toBe(30)
  })
})
