// Pins the promo's copies of game facts to the game itself, as logo.test.ts pins public/icon.svg.
import { expect, it } from "vitest"
import { ACHIEVEMENTS, TIER_COLOR, TIER_ORDER } from "../../src/lib/achievements"
import { LOGO as GAME_LOGO } from "../../src/lib/logo"
import { KAYA_MARK, LOGO, SPLASH, TIERS, UNLOCK } from "./brand"

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

it("shows the splash's title, slogan and footer, with no version (storyboard-v2 fact 15)", () => {
  expect(SPLASH).toEqual({
    title: "Tic-Tac-Toe",
    slogan: "Three in a row. Zero excuses.",
    footer: "© 2026 Kaya Randomized",
  })
})

it("draws the Kaya mark exactly as amendment 1 section 2 gives it", () => {
  expect(KAYA_MARK).toEqual({
    box: 1024,
    stroke: 116,
    strokes: [
      { d: "M340 260V764", color: "#8fa8ff" },
      { d: "M372 540L690 262", color: "#8fa8ff" },
      { d: "M540 500L712 764", color: "#ff9f7a" },
    ],
  })
})
