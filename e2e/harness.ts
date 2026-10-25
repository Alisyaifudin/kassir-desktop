import type { Page } from "@playwright/test";

/**
 * Shared boot for the Tier-0 harness.
 *
 * The app under test is the entry at `/e2e.html` (`src/e2e/main.tsx`), which
 * swaps the Tauri plugins for an in-browser SQLite. Seeds are handed over
 * through `addInitScript` so they land before the first render: the entry runs
 * them right after it applies the real migration files.
 */
const E2E_URL = "/e2e.html";

export type Seed = { sql?: string[]; storage?: Record<string, unknown> };

/**
 * Navigates to the app and returns a live list of console errors and page
 * exceptions, so a test can assert the boot was clean.
 */
export async function boot(page: Page, seed: Seed = {}) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript((data: Seed) => {
    (window as unknown as { __E2E_SEED_SQL__?: string[] }).__E2E_SEED_SQL__ =
      data.sql ?? [];
    (
      window as unknown as { __E2E_SEED_STORAGE__?: Record<string, unknown> }
    ).__E2E_SEED_STORAGE__ = data.storage ?? {};
  }, seed);

  await page.goto(E2E_URL);
  return errors;
}

/** A cashier whose hash matches the e2e `verify_password` shim (`plain:<pw>`). */
export function cashierSql(name: string, password: string, role = "admin"): string {
  return `INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash)
          VALUES ('${name}', '${name}', '${role}', 'plain:${password}')`;
}

/** Signs in as an already-seeded cashier. */
export async function login(page: Page, name: string, password: string) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByLabel(/kata sandi/i).fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
}
