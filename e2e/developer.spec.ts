import { expect, test, type Page, type TestInfo } from "@playwright/test"
import { card, expectClose, openApp, rect, viewport } from "./helpers"

// Developer mode: the knock, the Developer section of Settings, the Players sheet, and the
// finish button after a loss at the top rung. Phones first, then desktop; each claim runs on both.

const button = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: typeof name === "string" })
const settingsSheet = (page: Page) => page.getByRole("dialog", { name: "Settings" })
const playersSheet = (page: Page) => page.getByRole("dialog", { name: "Players" })

/** The secret knock from src/lib/knock.ts, tapped for real, then Enter on the prompt. */
async function enterDeveloperMode(page: Page) {
  await openApp(page)
  await button(page, "Two player").click()
  await button(page, "Versus bot").click()
  await button(page, "Two player").click()
  await button(page, "History").click()
  const history = page.getByRole("dialog")
  await expect(history).toBeVisible()
  await history.getByRole("button", { name: "Back", exact: true }).click()
  await expect(history).toBeHidden()
  await button(page, "Start game").click()
  for (const n of [1, 5, 9, 3]) await button(page, `Cell ${n}, empty`).click()
  // The occupied centre lets the tap through to its wrapper, which completes the knock.
  await button(page, "Cell 5, O").locator("..").click()
  const prompt = page.getByRole("alertdialog", { name: "Developer mode" })
  await expect(prompt).toBeVisible({ timeout: 5_000 })
  await prompt.getByRole("button", { name: "Enter" }).click()
  await expect(button(page, "Start game")).toBeVisible()
}

async function openSettings(page: Page) {
  await button(page, "Settings").click()
  await expect(settingsSheet(page)).toBeVisible()
}

/** Tap (phones) or click (desktop) near the top edge, over the overlay and outside any sheet. */
async function tapOutside(page: Page, isMobile: boolean) {
  const vp = await viewport(page)
  if (isMobile) await page.touchscreen.tap(vp.width / 2, 8)
  else await page.mouse.click(vp.width / 2, 8)
}

const SHOTS: Record<string, string> = {
  "claim 1": "claim1-new-game-after-loss",
  "claim 2": "claim2-developer-section-fits",
  "claim 3": "claim3-players-sheet",
  "claim 4": "claim4-no-players-outside-dev",
}

/** A failed claim leaves e2e/artifacts/developer/<device>-<claim>.png behind. */
async function shotOnFailure({ page }: { page: Page }, info: TestInfo) {
  if (info.status === info.expectedStatus) return
  const claim = SHOTS[info.title.slice(0, 7)] ?? "claim"
  await page.screenshot({ path: `e2e/artifacts/developer/${info.project.name}-${claim}.png` })
}

const claims = (isPhone: boolean) => {
  test.afterEach(shotOnFailure)

  test('claim 1: "after losing a bot game at rung 30, the finish button reads New game (never Take it back)"', async ({
    page,
  }, info) => {
    test.setTimeout(120_000)
    await enterDeveloperMode(page)
    await openSettings(page)
    await settingsSheet(page).getByRole("spinbutton", { name: "Rung" }).fill("30")
    await settingsSheet(page).getByRole("button", { name: "Set", exact: true }).click()
    await expect(settingsSheet(page)).toBeHidden()
    await button(page, "Versus bot").click()
    await button(page, "Hard").click()
    await button(page, "Start game").click()
    await expect(page.getByText("Bot · Hard · 30")).toBeVisible()

    // Tapping the first free cell loses to a top-rung bot; a draw starts another game.
    const status = page.getByText(/^(You win!|You lost|It's a draw)$/)
    let lost = false
    let game = 0
    for (; game < 8 && !lost; game++) {
      for (let turn = 0; turn < 9 && !(await status.isVisible()); turn++) {
        const free = page
          .getByRole("button", { name: /^Cell \d, empty$/ })
          .and(page.locator(":enabled"))
        await expect(free.first().or(status)).toBeVisible()
        if (await status.isVisible()) break
        await free.first().click()
        await expect(page.getByText("Bot is thinking…")).toBeHidden({ timeout: 10_000 })
      }
      await expect(status).toBeVisible()
      lost = (await status.textContent()) === "You lost"
      if (!lost) await page.locator("button.cta").click()
    }
    info.annotations.push({ type: "measured", description: `games played ${game}, lost ${lost}` })
    expect(lost, "lost a game at rung 30").toBe(true)
    await expect(page.locator("button.cta")).toHaveText("New game")
    await expect(page.getByRole("button", { name: /take it back/i })).toHaveCount(0)
    await expect(page.getByText(/take it back/i)).toHaveCount(0)
  })

  test('claim 2: "Settings shows a Developer section with Rung/Set, Reset game data, Players, and Exit developer mode; it fits with no horizontal scroll and nothing clipped"', async ({
    page,
  }, info) => {
    await enterDeveloperMode(page)
    await openSettings(page)
    const sheet = settingsSheet(page)
    await expect(sheet.getByText("Developer", { exact: true })).toBeVisible()
    const controls = [
      sheet.getByRole("spinbutton", { name: "Rung" }),
      sheet.getByRole("button", { name: "Set", exact: true }),
      sheet.getByRole("button", { name: "Reset game data" }),
      sheet.getByRole("button", { name: "Players", exact: true }),
      sheet.getByRole("button", { name: "Exit developer mode" }),
    ]
    // Measure once the slide-up has settled: phones dock to the viewport, desktop to the room card.
    const settled = isPhone ? (await viewport(page)).height : (await rect(card(page))).bottom
    await expect.poll(async () => (await rect(sheet)).bottom).toBeCloseTo(settled, 0)
    const vp = await viewport(page)
    info.annotations.push({
      type: "measured",
      description: `scrollWidth ${vp.scrollWidth} innerWidth ${vp.width} innerHeight ${vp.height}`,
    })
    expect(vp.scrollWidth, "document.scrollWidth vs innerWidth").toBeLessThanOrEqual(vp.width)
    const box = await rect(sheet)
    expect(box.width).toBeLessThanOrEqual(420.5)
    const back = await rect(sheet.getByRole("button", { name: "Back", exact: true }))
    // The whole sheet is on screen: its top (title, nickname) is not pushed above the viewport.
    const title = await rect(sheet.getByRole("heading", { name: "Settings" }))
    expect(box.y, "Settings sheet top vs viewport top").toBeGreaterThanOrEqual(-0.5)
    expect(title.y, "Settings title top vs viewport top").toBeGreaterThanOrEqual(-0.5)
    // On a short phone the content scrolls inside the sheet; each control must be reachable by scrolling.
    for (const control of controls) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeVisible()
      const c = await rect(control)
      const name = (await control.getAttribute("aria-label")) ?? (await control.textContent()) ?? ""
      // Inside the sheet and the viewport on every side.
      expect(c.x, `${name} left`).toBeGreaterThanOrEqual(Math.max(box.x, 0) - 0.5)
      expect(c.right, `${name} right`).toBeLessThanOrEqual(Math.min(box.right, vp.width) + 0.5)
      expect(c.y, `${name} top`).toBeGreaterThanOrEqual(Math.max(box.y, 0) - 0.5)
      expect(c.bottom, `${name} bottom`).toBeLessThanOrEqual(Math.min(box.bottom, vp.height) + 0.5)
      // The label is not cut off inside its own box.
      const overflow = await control.evaluate((el) => el.scrollWidth - el.clientWidth)
      info.annotations.push({
        type: "measured",
        description: `${name}: x ${c.x.toFixed(1)}..${c.right.toFixed(1)} y ${c.y.toFixed(1)}..${c.bottom.toFixed(1)} in sheet x ${box.x.toFixed(1)}..${box.right.toFixed(1)} y ${box.y.toFixed(1)}..${box.bottom.toFixed(1)}, overflow ${overflow}`,
      })
      expect(overflow, `${name} text overflow`).toBeLessThanOrEqual(0)
      // The floating Back does not sit on top of it.
      const overlaps =
        c.x < back.right && back.x < c.right && c.y < back.bottom && back.y < c.bottom
      expect(overlaps, `${name} under the floating Back`).toBe(false)
    }
    const scroll = await sheet.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }))
    info.annotations.push({
      type: "measured",
      description: `sheet top ${box.y.toFixed(1)} bottom ${box.bottom.toFixed(1)} height ${box.height.toFixed(1)} vs innerHeight ${vp.height}; title top ${title.y.toFixed(1)}; sheet scrollHeight ${scroll.scrollHeight} clientHeight ${scroll.clientHeight} overflow-y ${scroll.overflowY}`,
    })
    // The sheet itself has no horizontal overflow.
    const sheetOverflow = await sheet.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(sheetOverflow, "sheet scrollWidth - clientWidth").toBeLessThanOrEqual(0)
  })

  test('claim 3: "tapping Players closes Settings and opens a Players bottom sheet (max 420px wide, 85dvh tall) saying Online play is not set up; it closes with Back and with a tap outside, landing on setup"', async ({
    page,
    isMobile,
  }, info) => {
    await enterDeveloperMode(page)
    const openPlayers = async () => {
      await openSettings(page)
      await settingsSheet(page).getByRole("button", { name: "Players", exact: true }).click()
      await expect(settingsSheet(page)).toBeHidden()
      await expect(playersSheet(page)).toBeVisible()
    }

    await openPlayers()
    const sheet = playersSheet(page)
    await expect(sheet.getByText("Online play is not set up")).toBeVisible()
    // Phones dock the sheet to the viewport; desktop docks it to the room card (see room.spec.ts).
    const vp = await viewport(page)
    const frame = isPhone
      ? { x: 0, width: vp.width, bottom: vp.height }
      : await rect(card(page)).then((c) => ({ x: c.x, width: c.width, bottom: c.bottom }))
    // Let the slide-in finish before measuring.
    await expect.poll(async () => (await rect(sheet)).bottom).toBeCloseTo(frame.bottom, 0)
    const box = await rect(sheet)
    info.annotations.push({
      type: "measured",
      description: `viewport ${vp.width}x${vp.height} scrollWidth ${vp.scrollWidth}; sheet x ${box.x.toFixed(1)} w ${box.width.toFixed(1)} h ${box.height.toFixed(1)} bottom ${box.bottom.toFixed(1)}; frame x ${frame.x.toFixed(1)} w ${frame.width.toFixed(1)} bottom ${frame.bottom.toFixed(1)}; 85dvh ${(vp.height * 0.85).toFixed(1)}`,
    })
    expect(box.width, "sheet width").toBeLessThanOrEqual(420.5)
    expectClose(box.width, Math.min(420, frame.width))
    expectClose(box.x + box.width / 2, frame.x + frame.width / 2)
    expectClose(box.height, vp.height * 0.85)
    expectClose(box.bottom, frame.bottom)
    expect(vp.scrollWidth, "document.scrollWidth vs innerWidth").toBeLessThanOrEqual(vp.width)

    await sheet.getByRole("button", { name: "Back", exact: true }).click()
    await expect(sheet).toBeHidden()
    await expect(settingsSheet(page)).toBeHidden()
    await expect(button(page, "Start game")).toBeVisible()

    await openPlayers()
    await tapOutside(page, isMobile)
    await expect(playersSheet(page)).toBeHidden()
    await expect(settingsSheet(page)).toBeHidden()
    await expect(button(page, "Start game")).toBeVisible()
  })

  test('claim 4: "outside developer mode there is no Players button in Settings"', async ({
    page,
  }, info) => {
    await openApp(page)
    await openSettings(page)
    await expect(
      settingsSheet(page).getByRole("button", { name: "Players", exact: true }),
    ).toHaveCount(0)
    await expect(settingsSheet(page).getByText("Developer", { exact: true })).toHaveCount(0)
    const box = await rect(settingsSheet(page))
    info.annotations.push({
      type: "measured",
      description: `Players buttons 0; Settings sheet height ${box.height.toFixed(1)} vs innerHeight ${(await viewport(page)).height}`,
    })
  })
}

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone profiles only")
  claims(true)
})

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop profiles only")
  claims(false)
})
