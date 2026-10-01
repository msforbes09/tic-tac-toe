import { describe, expect, it } from 'vitest'
import { type Alignment, spanOf } from './alignment'

// One character every 0.1 s, each 0.08 s long.
const align = (text: string): Alignment => ({
  characters: [...text],
  character_start_times_seconds: [...text].map((_, i) => i / 10),
  character_end_times_seconds: [...text].map((_, i) => i / 10 + 0.08),
})

describe('spanOf', () => {
  const take = align('Hi. Go now. Go on.')

  it('spans a phrase from its first character start to its last character end', () => {
    expect(spanOf(take, 'Go now.')).toEqual([0.4, 1.08])
  })

  it('finds a phrase after a given one, not its first occurrence', () => {
    const [start, end] = spanOf(take, 'Go', 'Go now.')
    expect(start).toBeCloseTo(1.2)
    expect(end).toBeCloseTo(1.38)
  })

  it('throws when the take does not contain the phrase', () => {
    expect(() => spanOf(take, 'Stop.')).toThrow('"Stop."')
  })
})
