import { describe, expect, it } from "vitest"
import {
  type Box,
  CANVAS,
  LAYOUTS,
  MARK_SETTLE,
  SAFE,
  SLIDE,
  SPLASH_OUT_SCALE,
  SPLASH_RISE,
  TOAST_DROP,
  TYPE,
  zones,
} from "./layout"

const inside = (box: Box, safe: Box) =>
  box.x >= safe.x &&
  box.y >= safe.y &&
  box.x + box.w <= safe.x + safe.w &&
  box.y + box.h <= safe.y + safe.h

// Every essential layer's box, stretched over the whole of its motion.
const travel = (layout: (typeof LAYOUTS)[number]) => {
  const z = zones(layout)
  const down = (b: Box, by: number) => ({ ...b, h: b.h + by })
  const up = (b: Box, by: number) => ({ ...b, y: b.y - by, h: b.h + by })
  // The splash-out scales the whole splash about the canvas centre.
  const { width, height } = CANVAS[layout]
  const scaled = (b: Box, s: number): Box => ({
    x: width / 2 + (b.x - width / 2) * s,
    y: height / 2 + (b.y - height / 2) * s,
    w: b.w * s,
    h: b.h * s,
  })
  const settled = (b: Box) => down(b, SLIDE + MARK_SETTLE)
  return {
    splash: scaled(down(z.splash, SPLASH_RISE), SPLASH_OUT_SCALE),
    footer: scaled(z.footer, SPLASH_OUT_SCALE),
    board: down(z.board, SLIDE),
    subline: down(z.subline, SLIDE),
    bubble: down(z.bubble, SLIDE),
    thinking: z.thinking,
    toast: up(z.bubble, TOAST_DROP),
    content: down(z.content, SLIDE),
    mark: settled(z.kaya.mark),
    wordmark: settled(z.kaya.wordmark),
    url: settled(z.kaya.url),
  }
}

describe("safe areas (storyboard check 10 and margins)", () => {
  it("keeps the 9:16 safe area out of the top 250 px and bottom 400 px, 72 px from the sides", () => {
    expect(SAFE.reel).toEqual({ x: 72, y: 250, w: 936, h: 1270 })
  })

  it("keeps 60 px clear on every side of the 1:1", () => {
    expect(SAFE.square).toEqual({ x: 60, y: 60, w: 960, h: 960 })
  })

  it.each(LAYOUTS)(
    "keeps every essential layer of the %s inside its safe area through its motion",
    (layout) => {
      for (const [name, box] of Object.entries(travel(layout))) {
        expect(inside(box, SAFE[layout]), `${layout} ${name}`).toBe(true)
      }
    },
  )

  it.each(LAYOUTS)("sets no %s text under 28 px", (layout) => {
    for (const size of Object.values(TYPE[layout])) expect(size).toBeGreaterThanOrEqual(28)
  })

  it("centres the splash stack on y 808 / 497 and the footer on y 1470 / 975", () => {
    const centre = (b: Box) => b.y + b.h / 2
    expect(centre(zones("reel").splash)).toBeCloseTo(808, 0)
    expect(centre(zones("square").splash)).toBeCloseTo(497, 0)
    expect(centre(zones("reel").footer)).toBeCloseTo(1470, 0)
    expect(centre(zones("square").footer)).toBeCloseTo(975, 0)
  })

  it("sizes the splash logo 690 / 517 and the thinking badge 120 / 88, centred in the bubble zone", () => {
    expect(zones("reel").splashLogo).toBe(690)
    expect(zones("square").splashLogo).toBe(517)
    expect(zones("reel").thinking).toEqual({ x: 480, y: 320, w: 120, h: 120 })
    expect(zones("square").thinking).toEqual({ x: 496, y: 116, w: 88, h: 88 })
  })

  it("places the Kaya mark, wordmark and URL where amendment 1 section 3 puts them", () => {
    expect(zones("reel").kaya).toEqual({
      mark: { x: 170, y: 371, w: 720, h: 720 },
      wordmark: { x: 72, y: 1013, w: 936, h: 120 },
      url: { x: 72, y: 1153, w: 936, h: 53 },
    })
    expect(zones("square").kaya).toEqual({
      mark: { x: 211, y: 123, w: 640, h: 640 },
      wordmark: { x: 72, y: 685, w: 936, h: 92 },
      url: { x: 72, y: 791, w: 936, h: 41 },
    })
  })

  it("places the board where the storyboard anchors it", () => {
    expect(zones("reel").board).toEqual({ x: 120, y: 560, w: 840, h: 840 })
    expect(zones("square").board).toEqual({ x: 230, y: 330, w: 620, h: 620 })
  })
})
