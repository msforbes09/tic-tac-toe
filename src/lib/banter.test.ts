import { describe, expect, it } from 'vitest'
import { BANTER, SETUP_HINTS, TONES, banterFor, type Tone } from './banter'
import type { Difficulty } from './types'
import type { GameResult } from './ladder'

const BANDS: Difficulty[] = ['easy', 'medium', 'hard']
const RESULTS: GameResult[] = ['win', 'loss', 'draw']

describe('banter pools', () => {
  it('has ten lines for every tone, band and result', () => {
    for (const tone of TONES)
      for (const band of BANDS)
        for (const result of RESULTS) {
          const pool = BANTER[tone][band][result]
          expect(pool, `${tone}/${band}/${result}`).toHaveLength(10)
          expect(new Set(pool).size, `${tone}/${band}/${result} repeats`).toBe(10)
        }
  })

  it('has a setup hint per tone and band', () => {
    for (const tone of TONES) for (const band of BANDS) expect(SETUP_HINTS[tone][band]).toBeTruthy()
  })

  it('offers exactly the friendly and cocky tones', () => {
    expect(TONES).toEqual<Tone[]>(['friendly', 'cocky'])
  })
})

describe('banterFor', () => {
  it('picks from the pool for the band and result using the rng', () => {
    expect(banterFor('hard', 'draw', () => 0)).toBe(BANTER.friendly.hard.draw[0])
    expect(banterFor('easy', 'win', () => 0.999)).toBe(BANTER.friendly.easy.win[9])
    expect(banterFor('medium', 'loss', () => 0.35)).toBe(BANTER.friendly.medium.loss[3])
  })

  it('defaults to the friendly tone and accepts cocky', () => {
    expect(banterFor('hard', 'loss', () => 0)).toBe(BANTER.friendly.hard.loss[0])
    expect(banterFor('hard', 'loss', () => 0, 'cocky')).toBe(BANTER.cocky.hard.loss[0])
  })

  it('always returns a member of the pool with Math.random', () => {
    for (let i = 0; i < 50; i++) expect(BANTER.friendly.medium.win).toContain(banterFor('medium', 'win'))
  })
})
