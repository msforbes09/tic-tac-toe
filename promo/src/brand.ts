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

// The app's splash (Splash.tsx on develop), shown in shot 0. The film drops the app's version (storyboard-v2).
export const SPLASH = {
  title: "Tic-Tac-Toe",
  slogan: "Three in a row. Zero excuses.",
  footer: "© 2026 Kaya Randomized",
}

// The Kaya Randomized mark on shot 8 (storyboard-v2 amendment 1): three round-capped strokes in a 1024 box,
// drawn in this order, the coral leg on top.
export const KAYA_MARK = {
  box: 1024,
  stroke: 116,
  strokes: [
    { d: "M340 260V764", color: "#8fa8ff" },
    { d: "M372 540L690 262", color: "#8fa8ff" },
    { d: "M540 500L712 764", color: "#ff9f7a" },
  ],
}

// The achievement shot 3 unlocks (bronze).
export const UNLOCK = {
  name: "Beat the Machine",
  description: "Beat the bot for the first time",
  color: TIERS[0].color,
}
