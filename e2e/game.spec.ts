import { expect, test } from "@playwright/test"
import { card, expectClose, openApp, playBotGame, rect, viewport } from "./helpers"

// The first bot game unlocks "Hello, Bot", so one game is enough to see the toast.
const toast = (page: Parameters<typeof openApp>[0]) =>
  page.getByRole("status").filter({ hasText: "Achievement unlocked" })

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone profiles only")

  test("a full bot game can be played by tap", async ({ page }) => {
    await openApp(page)
    await playBotGame(page)
    await expect(page.getByText(/You win!|You lost|Draw/)).toBeVisible()
  })

  test("the achievement toast is centred", async ({ page }) => {
    await openApp(page)
    await playBotGame(page)
    await expect(toast(page)).toBeVisible()
    const vp = await viewport(page)
    const box = await rect(toast(page))
    expectClose(box.x + box.width / 2, vp.width / 2)
  })
})

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop profiles only")

  test("the toast centre equals the card centre", async ({ page }) => {
    await openApp(page)
    await playBotGame(page)
    await expect(toast(page)).toBeVisible()
    const main = await rect(card(page))
    // The toast drops in from above; measure once it has landed inside the card, below the bezel.
    await expect
      .poll(async () => (await rect(toast(page))).y, "toast lands inside the card")
      .toBeGreaterThan(main.y + 4)
    const box = await rect(toast(page))
    expectClose(box.x + box.width / 2, main.x + main.width / 2)
  })
})
