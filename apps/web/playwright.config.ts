import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the real built site and Pages Functions, with a
 * local D1 and test-only fake eyes (no API key, no cost). Chromium only, so it
 * stays light; phone and tablet sizes are emulated.
 */
const PORT = 8789;

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { viewport: { width: 834, height: 1194 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: "desktop", use: { viewport: { width: 1360, height: 900 } } },
  ],
  webServer: {
    command: `./node_modules/.bin/wrangler pages dev dist --port ${PORT} --binding FAKE_EYES=1 --binding READS_PER_HOUR=100000`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
  },
});
