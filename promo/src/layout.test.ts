import { describe, expect, it } from "vitest"
import { type Box, LAYOUTS, LOGO_SETTLE, SAFE, SLIDE, TOAST_DROP, TYPE, zones } from "./layout"

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
  return {
    board: down(z.board, SLIDE),
    title: down(z.title, SLIDE),
    bubble: down(z.bubble, SLIDE),
    toast: up(z.bubble, TOAST_DROP),
    content: down(z.content, SLIDE),
    logo: down(z.logo, SLIDE + LOGO_SETTLE),
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

  it("places the board where the storyboard anchors it", () => {
    expect(zones("reel").board).toEqual({ x: 120, y: 560, w: 840, h: 840 })
    expect(zones("square").board).toEqual({ x: 230, y: 330, w: 620, h: 620 })
  })
})
