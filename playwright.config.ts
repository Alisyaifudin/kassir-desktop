import { defineConfig, devices } from "@playwright/test";

/**
 * Tier-0 end-to-end tests: the real React app in Chromium, backed by an
 * in-browser SQLite (sql.js) that runs the real migration files.
 *
 * No Tauri binary, no Rust build, no WebDriver. The Tauri plugins are replaced
 * at the service layer — see `src/e2e/main.tsx`. Anything that needs the real
 * Rust process (printing, dialogs, updater, ACL, the WebKitGTK/WebView2 engine
 * itself) belongs in the WDIO native suite, not here.
 */
export default defineConfig({
  testDir: "./e2e",
  // `.e2e.ts`, not `.spec.ts`: `bun test` globs `*.spec.*` and would try to run
  // these without Playwright.
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Two workers, not the CPU count: every test signs in with a real bcrypt hash
  // (250 ms of pure CPU), and four of those in parallel on a CI runner starve
  // each other past the 30 s test timeout — a red job that says nothing about
  // the app. The suite is seven tests; the wall clock is ~12 s either way.
  workers: 2,
  reporter: process.env.CI ? "line" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:1420/e2e.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
