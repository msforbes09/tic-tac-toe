import { defineConfig, devices } from "@playwright/test"

// Phone first: projects run in this order and the report lists them in this order.
// Only Chromium is installed; the iPhone profile keeps its viewport, touch, and user agent.
const CI = !!process.env.CI
const PORT = 4173

export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/artifacts",
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  // CI's Linux run owns the snapshots; a local run on another platform gets a small tolerance.
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{arg}-{projectName}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: CI ? 0.01 : 0.08 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iphone-14", use: { ...devices["iPhone 14"], browserName: "chromium" } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop-2000",
      use: { ...devices["Desktop Chrome"], viewport: { width: 2000, height: 1188 } },
    },
  ],
  webServer: {
    // CI serves the built dist; locally the Vite dev server is enough and can already be running.
    command: CI
      ? `npx vite preview --port ${PORT} --strictPort`
      : `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 60_000,
  },
})
