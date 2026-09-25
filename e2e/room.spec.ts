import { expect, test } from "@playwright/test"
import { card, expectClose, openApp, rect, splash, viewport } from "./helpers"

// Phone first. The room (card, bezel, shift, glows, brand, colophon) exists on wide screens only.

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone profiles only")

  test("the column fills the viewport with no card, bezel, shift, backdrop, brand corner, or colophon", async ({
    page,
  }) => {
    await openApp(page)
    const vp = await viewport(page)
    const main = await rect(card(page))
    expectClose(main.x, 0)
    expectClose(main.width, vp.width)
    const style = await card(page).evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        radius: cs.borderTopLeftRadius,
        shadow: cs.boxShadow,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
      }
    })
    expect(style).toEqual({ radius: "0px", shadow: "none", marginTop: "0px", marginRight: "0px" })
    await expect(page.locator(".room-backdrop")).toBeHidden()
    await expect(page.locator(".room-brand")).toBeHidden()
    await expect(page.locator(".room-colophon")).toBeHidden()
  })

  test("held sideways, the column stays a plain centred column with no room around it", async ({
    page,
    viewport: size,
  }) => {
    await page.setViewportSize({ width: size!.height, height: size!.width })
    await openApp(page)
    const vp = await viewport(page)
    const main = await rect(card(page))
    // As on develop: at most 420px wide and centred, with none of the desktop room.
    expectClose(main.x, (vp.width - main.width) / 2)
    const style = await card(page).evaluate((el) => {
      const cs = getComputedStyle(el)
      return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, marginRight: cs.marginRight }
    })
    expect(style).toEqual({ radius: "0px", shadow: "none", marginRight: "0px" })
    await expect(page.locator(".room-backdrop")).toBeHidden()
    expect(vp.scrollWidth).toBeLessThanOrEqual(vp.width)
  })

  test("the page never scrolls horizontally", async ({ page }) => {
    await openApp(page)
    const vp = await viewport(page)
    expect(vp.scrollWidth).toBeLessThanOrEqual(vp.width)
  })

  test("the splash covers the viewport and hands off to setup with no jump", async ({ page }) => {
    await page.goto("/")
    const vp = await viewport(page)
    const overlay = await rect(splash(page))
    expect(overlay).toMatchObject({ x: 0, y: 0, width: vp.width, height: vp.height })
    const before = await rect(card(page))
    await expect(splash(page)).toBeHidden({ timeout: 8_000 })
    const after = await rect(card(page))
    expect(after).toEqual(before)
  })

  test("a bottom sheet docks to the viewport bottom and spans full width", async ({ page }) => {
    await openApp(page)
    await page.getByRole("button", { name: "Settings" }).click()
    const sheet = page.locator('[data-slot="sheet-content"]')
    await expect(sheet.getByText("Settings")).toBeVisible()
    const vp = await viewport(page)
    // The sheet slides up over 200ms; measure once it has settled.
    await expect.poll(async () => (await rect(sheet)).bottom).toBeCloseTo(vp.height, 0)
    const box = await rect(sheet)
    expectClose(box.x, 0)
    expectClose(box.width, vp.width)
  })

  test("the CTA sits above the safe-area inset", async ({ page }) => {
    await openApp(page)
    const vp = await viewport(page)
    const cta = await rect(page.getByRole("button", { name: "Start game" }))
    // max(1rem, env(safe-area-inset-bottom)) of padding: never flush with the bottom edge.
    expect(cta.bottom).toBeLessThanOrEqual(vp.height - 16)
  })

  test("the setup screen looks as it did when the room shipped", async ({ page }) => {
    await openApp(page)
    await expect(page).toHaveScreenshot("setup.png", { animations: "disabled" })
  })
})

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop profiles only")

  test("the page never scrolls", async ({ page }) => {
    await openApp(page)
    const vp = await viewport(page)
    expect(vp.scrollWidth).toBeLessThanOrEqual(vp.width)
    expect(vp.scrollHeight).toBeLessThanOrEqual(vp.height)
  })

  test("the splash column rectangle equals the card's", async ({ page }) => {
    await page.goto("/")
    const overlay = splash(page)
    const vp = await viewport(page)
    expect(await rect(overlay)).toMatchObject({ x: 0, y: 0, width: vp.width, height: vp.height })
    const column = await rect(overlay.locator(".room-card"))
    const main = await rect(card(page))
    expect(column).toEqual(main)
  })

  test("a sheet's left edge equals the card's", async ({ page }) => {
    await openApp(page)
    const main = await rect(card(page))
    await page.getByRole("button", { name: "Settings" }).click()
    const sheet = page.locator('[data-slot="sheet-content"]')
    await expect(sheet.getByText("Settings")).toBeVisible()
    const box = await rect(sheet)
    expectClose(box.x, main.x)
    expectClose(box.width, main.width)
  })

  test("brand top right and colophon bottom right are visible", async ({ page }) => {
    await openApp(page)
    const vp = await viewport(page)
    const brand = await rect(page.locator(".room-brand"))
    const colophon = await rect(page.locator(".room-colophon"))
    await expect(page.locator(".room-brand")).toBeVisible()
    await expect(page.locator(".room-colophon")).toHaveText(/^v\d+\.\d+\.\d+ · © \d{4} iam4bs$/)
    expect(brand.right).toBeGreaterThan(vp.width * 0.9)
    expect(brand.y).toBeLessThan(80)
    expect(colophon.right).toBeGreaterThan(vp.width * 0.9)
    expect(colophon.bottom).toBeGreaterThan(vp.height * 0.9)
  })
})
