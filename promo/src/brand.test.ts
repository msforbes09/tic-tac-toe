// Pins the promo's copies of game facts to the game itself, as logo.test.ts pins public/icon.svg.
import { expect, it } from "vitest"
import { ACHIEVEMENTS, TIER_COLOR, TIER_ORDER } from "../../src/lib/achievements"
import { LOGO as GAME_LOGO } from "../../src/lib/logo"
import { LOGO, TIERS, UNLOCK } from "./brand"

it("draws the game's logo geometry", () => {
  expect(LOGO).toEqual(GAME_LOGO)
})

it("shows the game's tiers, colours and counts, in tier order", () => {
  expect(TIERS).toEqual(
    TIER_ORDER.map((tier) => ({
      color: TIER_COLOR[tier],
      count: ACHIEVEMENTS.filter((a) => a.tier === tier).length,
    })),
  )
})

it("unlocks a real achievement with its own name, description and tier colour", () => {
  const a = ACHIEVEMENTS.find((x) => x.name === UNLOCK.name)
  expect(a?.description).toBe(UNLOCK.description)
  expect(a && TIER_COLOR[a.tier]).toBe(UNLOCK.color)
})
