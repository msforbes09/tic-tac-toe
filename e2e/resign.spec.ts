import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"
import { openApp, playBotGame, rect, viewport } from "./helpers"

// Resigning a bot game: once each side has moved, Back reads Resign and New game is off; resigning
// records a loss. Two-player games keep Back and New game. Phones first, then desktop.

const button = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: typeof name === "string" })
/** The top-left button of the game header, whatever it reads. */
const topLeft = (page: Page) => page.locator("section > header > button").first()
const newGame = (page: Page) => button(page, "New game")
const freeCells = (page: Page) =>
  page.getByRole("button", { name: /^Cell \d, empty$/ }).and(page.locator(":enabled"))
const thinking = (page: Page) => page.getByText("Bot is thinking…")
const result = (page: Page) => page.getByText(/^(You win!|You lost|It's a draw)$/)

async function startBotGame(page: Page) {
  await openApp(page)
  await button(page, "Versus bot").click()
  await button(page, "Easy").click()
  await button(page, "Start game").click()
  await expect(topLeft(page)).toBeVisible()
}

/** Wait until it is our move (the bot may open when it holds X). */
async function ourTurn(page: Page) {
  await expect(thinking(page)).toBeHidden({ timeout: 10_000 })
  await expect(freeCells(page).first()).toBeEnabled()
}

/** Plays until both sides have moved and the game is still going. */
async function reachBothMoved(page: Page) {
  await ourTurn(page)
  await freeCells(page).first().click()
  await ourTurn(page)
  await expect(page.getByRole("button", { name: /^Cell \d, X$/ }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /^Cell \d, O$/ }).first()).toBeVisible()
  await expect(result(page)).toHaveCount(0)
}

/** Header geometry for the Resign label: one line, not clipped, clear of the pill and chip. */
async function headerFit(page: Page, info: TestInfo) {
  const label = topLeft(page)
  const box = await rect(label)
  const lines = await label.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    // One line box per line of text; merge rects that share a top edge.
    const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)))
    return tops.size
  })
  const overflow = await label.evaluate((el) => ({
    x: el.scrollWidth - el.clientWidth,
    y: el.scrollHeight - el.clientHeight,
  }))
  const header = await rect(page.locator("section > header").first())
  const spans = page.locator("section > header > span")
  const others: { text: string; box: Awaited<ReturnType<typeof rect>> }[] = []
  for (let i = 0; i < (await spans.count()); i++)
    others.push({ text: (await spans.nth(i).innerText()).trim(), box: await rect(spans.nth(i)) })
  const vp = await viewport(page)
  info.annotations.push({
    type: "measured",
    description:
      `label "${(await label.innerText()).trim()}" x ${box.x.toFixed(1)}..${box.right.toFixed(1)} h ${box.height.toFixed(1)} lines ${lines} overflow ${overflow.x}/${overflow.y}; ` +
      `header x ${header.x.toFixed(1)}..${header.right.toFixed(1)}; ` +
      others.map((o) => `"${o.text}" x ${o.box.x.toFixed(1)}..${o.box.right.toFixed(1)}`).join("; ") +
      `; scrollWidth ${vp.scrollWidth} innerWidth ${vp.width}`,
  })
  expect(lines, "Resign label line count").toBe(1)
  expect(overflow.x, "Resign scrollWidth - clientWidth").toBeLessThanOrEqual(0)
  expect(overflow.y, "Resign scrollHeight - clientHeight").toBeLessThanOrEqual(0)
  expect(box.x, "Resign left vs viewport").toBeGreaterThanOrEqual(-0.5)
  for (const o of others)
    expect(box.right, `Resign right vs "${o.text}" left`).toBeLessThanOrEqual(o.box.x + 0.5)
  expect(vp.scrollWidth, "document.scrollWidth vs innerWidth").toBeLessThanOrEqual(vp.width)
}

const SHOTS: Record<string, string> = {
  "claim 1": "claim1-back-before-both-moved",
  "claim 2": "claim2-resign-mid-game",
  "claim 3": "claim3-resign-records-loss",
  "claim 4": "claim4-back-after-finish",
  "claim 5": "claim5-two-player-unchanged",
}

/** A failed claim leaves e2e/artifacts/resign/<device>-<claim>.png behind. */
async function shotOnFailure({ page }: { page: Page }, info: TestInfo) {
  if (info.status === info.expectedStatus) return
  const claim = SHOTS[info.title.slice(0, 7)] ?? "claim"
  const suffix = info.title.includes("streak pill") ? "-streak" : ""
  await page.screenshot({ path: `e2e/artifacts/resign/${info.project.name}-${claim}${suffix}.png` })
}

const claims = () => {
  test.afterEach(shotOnFailure)

  test('claim 1: "before you move and after only your move (bot has not answered yet), the top-left button reads ← Back and New game is enabled"', async ({
    page,
  }) => {
    // Hold the clock so the bot's reply cannot land between our move and the check.
    await page.clock.install()
    await startBotGame(page)
    await ourTurn(page)
    await expect(topLeft(page)).toHaveText("← Back")
    await expect(newGame(page)).toBeEnabled()

    const now = await page.evaluate(() => Date.now())
    await page.clock.pauseAt(now + 1_000)
    await freeCells(page).first().click()
    await expect(thinking(page)).toBeVisible()
    await expect(topLeft(page)).toHaveText("← Back")
    await expect(newGame(page)).toBeEnabled()
    await page.clock.resume()
  })

  test('claim 2: "once each side has moved and the game is still going, the top-left reads Resign and New game is disabled; Resign fits the header with no wrap, clip, overlap, or horizontal scroll"', async ({
    page,
  }, info) => {
    await startBotGame(page)
    await reachBothMoved(page)
    await expect(topLeft(page)).toHaveText("← Resign")
    await expect(newGame(page)).toBeDisabled()
    await headerFit(page, info)
  })

  test('claim 2: "Resign fits the header" with the streak pill showing', async ({ page }, info) => {
    // Five straight wins put the pill in the header: the widest it gets mid-game.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(
          "tic-tac-toe:ladder",
          JSON.stringify({ rung: 1, streak: 5, updatedAt: Date.now() }),
        )
        sessionStorage.setItem("seeded", "1")
      }
    })
    await startBotGame(page)
    await expect(page.getByText("5 in a row")).toBeVisible()
    await reachBothMoved(page)
    await expect(topLeft(page)).toHaveText("← Resign")
    await expect(newGame(page)).toBeDisabled()
    await headerFit(page, info)
  })

  test('claim 3: "tapping Resign asks first, then Yes, resign returns to the setup screen; History (bot mode) then shows the game as a loss"', async ({
    page,
  }) => {
    await startBotGame(page)
    await reachBothMoved(page)
    // Resign asks first: Keep playing stays in the game, Yes, resign leaves.
    await topLeft(page).click()
    await expect(page.getByRole("alertdialog")).toContainText("Resign this game?")
    await button(page, "Keep playing").click()
    await expect(page.getByRole("alertdialog")).toBeHidden()
    await expect(topLeft(page)).toHaveText("← Resign")
    await topLeft(page).click()
    await button(page, "Yes, resign").click()
    await expect(button(page, "Start game")).toBeVisible()
    await expect(button(page, "Versus bot")).toHaveAttribute("aria-pressed", "true")
    await button(page, "History").click()
    const sheet = page.getByRole("dialog")
    await expect(sheet).toBeVisible()
    const rows = sheet.getByRole("listitem")
    // A fresh profile: the resigned game is the only row, and it is a loss.
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText("You lost")
  })

  test('claim 4: "after a game finishes normally, the top-left reads ← Back and New game is enabled"', async ({
    page,
  }, info) => {
    await openApp(page)
    await button(page, "Versus bot").click()
    await button(page, "Easy").click()
    await playBotGame(page)
    info.annotations.push({ type: "measured", description: `result ${await result(page).innerText()}` })
    await expect(topLeft(page)).toHaveText("← Back")
    await expect(newGame(page)).toBeEnabled()
  })

  test('claim 5: "two-player games are unchanged: Back always reads ← Back and New game stays enabled mid-game"', async ({
    page,
  }) => {
    await openApp(page)
    await button(page, "Two player").click()
    await button(page, "Start game").click()
    const check = async () => {
      await expect(topLeft(page)).toHaveText("← Back")
      await expect(newGame(page)).toBeEnabled()
    }
    await check()
    // X 1, O 2, X 4, O 5: both sides have moved twice, nobody has won.
    for (const n of [1, 2, 4, 5]) {
      await button(page, `Cell ${n}, empty`).click()
      await check()
    }
    await expect(page.getByText("Player 1's turn")).toBeVisible()
  })
}

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone profiles only")
  claims()
})

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop profiles only")
  claims()
})
