import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, ACHIEVEMENTS_KEY, EMPTY_STATE, achievementById, isAchievementId, loadAchievements, saveAchievements } from './achievements'
import type { HistoryStorage } from './history'

const memory = (): HistoryStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}

describe('catalogue', () => {
  it('has 41 achievements with unique ids and one platinum', () => {
    expect(ACHIEVEMENTS).toHaveLength(41)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(41)
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'platinum').map((a) => a.id)).toEqual(['grand-master'])
  })

  it('looks up by id and validates ids', () => {
    expect(achievementById('hello-bot').name).toBe('Hello, Bot')
    expect(isAchievementId('hello-bot')).toBe(true)
    expect(isAchievementId('nope')).toBe(false)
  })
})

describe('storage', () => {
  it('round-trips and returns the empty state for nothing or bad data', () => {
    const s = memory()
    expect(loadAchievements(s)).toEqual(EMPTY_STATE)
    const state = { ...EMPTY_STATE, unlocks: { 'hello-bot': 5 }, badge: 'hello-bot' as const, updatedAt: 9 }
    saveAchievements(s, state)
    expect(loadAchievements(s)).toEqual(state)
    s.setItem(ACHIEVEMENTS_KEY, '{oops')
    expect(loadAchievements(s)).toEqual(EMPTY_STATE)
  })

  it('drops unknown unlock ids and bad counters but keeps the rest', () => {
    const s = memory()
    s.setItem(
      ACHIEVEMENTS_KEY,
      JSON.stringify({
        progress: { ...EMPTY_STATE.progress, botDraws: 'x', promotions: 2 },
        unlocks: { 'hello-bot': 5, future: 6 },
        badge: 'future',
        updatedAt: 1,
      }),
    )
    const loaded = loadAchievements(s)
    expect(loaded.unlocks).toEqual({ 'hello-bot': 5 })
    expect(loaded.progress.botDraws).toBe(0)
    expect(loaded.progress.promotions).toBe(2)
    expect(loaded.badge).toBeUndefined()
  })
})
