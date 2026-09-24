import { describe, expect, it } from 'vitest'
import { KNOCK, KNOCK_DELAY_MS, knockStep, type KnockEvent } from './knock'

describe('the knock', () => {
  it('is the owner’s sequence across setup, History, and the board', () => {
    expect(KNOCK).toEqual<KnockEvent[]>([
      'mode:pvp',
      'mode:bot',
      'mode:pvp',
      'history:open',
      'history:back',
      'start',
      'cell:0',
      'cell:4',
      'cell:8',
      'cell:2',
      'cell:4',
    ])
    expect(KNOCK_DELAY_MS).toBe(2000)
  })

  it('advances one step per matching event and completes at the end', () => {
    let progress = 0
    for (const event of KNOCK) progress = knockStep(progress, event)
    expect(progress).toBe(KNOCK.length)
  })

  it('resets on a wrong event, or restarts if that event is the first step', () => {
    expect(knockStep(3, 'cell:0')).toBe(0)
    expect(knockStep(3, 'mode:pvp')).toBe(1)
    expect(knockStep(0, 'start')).toBe(0)
  })
})
