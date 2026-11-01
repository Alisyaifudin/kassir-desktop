import { expect, type Page } from "@playwright/test";

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

/**
 * A top-nav tab, by the route it opens.
 *
 * Selected by `href` inside the topbar's own `<nav>`: the tabs became anchors
 * when they moved onto the app's own `NavLink`, so a role selector no longer
 * tells them apart from the brand link ("Toko" is both) or from Beranda's
 * `Transaksi Baru` button, which is a link to `#/pos` in a `<header>` of its own.
 */
export function navTab(page: Page, path: string) {
  return page.locator(`header nav a[href="#${path}"]`);
}

/**
 * The topbar's brand — the shop name beside the page title, which links home.
 *
 * By `href`, not by label: an unnamed shop falls back to "Toko", which is also
 * the label of the Toko nav tab right beside it.
 */
export function brand(page: Page) {
  return page.locator('header nav a[href="#/"]');
}

/**
 * Signs in, and waits for the screen the app navigates to.
 *
 * `login` returns as soon as the button is clicked, but signing in is async —
 * verify, write the session, then navigate — so a test that writes the URL
 * itself right afterwards races the app's own navigation.
 */
export async function loginAndSettle(page: Page, name: string, password: string) {
  await login(page, name, password);
  await expect(page).not.toHaveURL(/#\/login/);
}
