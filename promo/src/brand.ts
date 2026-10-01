// Facts the film copies from the game (logo geometry, achievement tiers, the unlock it shows).
// The game stays untouched, so these are copies; brand.test.ts pins each one to the game's own source.

// src/lib/logo.ts: an X top-left and an O bottom-right in a 512 box, a background gap where they cross.
export const LOGO = {
  size: 512,
  stroke: 44,
  gap: 9,
  x: { cx: 200, cy: 200, arm: 90 },
  o: { cx: 330, cy: 330, r: 90 },
}

// src/lib/achievements.ts: tier colours and how many achievements each tier holds, bronze first.
export const TIERS = [
  { color: "#cd7f32", count: 16 },
  { color: "#b8c0c8", count: 14 },
  { color: "#f2c14e", count: 10 },
  { color: "#9fe3ff", count: 1 },
]

// The achievement shot 3 unlocks (bronze).
export const UNLOCK = {
  name: "Beat the Machine",
  description: "Beat the bot for the first time",
  color: TIERS[0].color,
}
