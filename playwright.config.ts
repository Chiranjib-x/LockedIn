import { defineConfig, devices } from "@playwright/test";

// QUEUE A1: the project's first tracked test runner. Mobile viewport (students
// are on phones); mother app on :3001. baseURL is overridable so the same specs
// can later run against a deployed URL (PLAYWRIGHT_BASE_URL).
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  // Auto-start the mother dev server unless pointed at an external URL.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -w lockedin -- --port 3001",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: true,
      },
});
