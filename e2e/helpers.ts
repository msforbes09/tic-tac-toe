import { expect, type Locator, type Page } from "@playwright/test"

export type Rect = {
  x: number
  y: number
  width: number
  height: number
  right: number
  bottom: number
}

export async function rect(target: Locator): Promise<Rect> {
  const box = await target.boundingBox()
  if (!box) throw new Error("element has no box")
  return { ...box, right: box.x + box.width, bottom: box.y + box.height }
}

export const viewport = (page: Page) =>
  page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))

/** The splash overlay; `hidden` once it has handed off to setup. */
export const splash = (page: Page) => page.getByRole("status", { name: "Tic-Tac-Toe" })

/** Open the app and wait for the splash to leave. */
export async function openApp(page: Page) {
  await page.goto("/")
  await expect(splash(page)).toBeHidden({ timeout: 8_000 })
  // iPhone gets the manual install steps once the splash has left; a fresh profile sees them every run.
  const install = page.getByRole("alertdialog", { name: "Add to Home Screen" })
  if (await install.isVisible()) await install.getByRole("button", { name: "Not now" }).click()
  await expect(page.getByRole("button", { name: "Start game" })).toBeVisible()
}

export const card = (page: Page) => page.locator("main.room-card")

/** Plays one bot game by tapping the first free cell until the game ends. */
export async function playBotGame(page: Page) {
  await page.getByRole("button", { name: "Start game" }).click()
  const finished = page.locator("button.cta", { hasText: /New game|Take it back/ })
  for (let turn = 0; turn < 9 && !(await finished.isVisible()); turn++) {
    const free = page
      .getByRole("button", { name: /^Cell \d, empty$/ })
      .and(page.locator(":enabled"))
    await expect(free.first()).toBeEnabled()
    await free.first().click()
    // The bot replies after a delay, then it is our move again or the game is over.
    await expect(page.getByText("Bot is thinking…")).toBeHidden()
  }
  await expect(finished).toBeVisible()
}

/** Close to within a pixel: layout math in different engines lands on sub-pixel values. */
export function expectClose(actual: number, expected: number, tolerance = 1) {
  expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance)
}
