import { expect, test, type Page } from "@playwright/test";

/**
 * Tier-0 end-to-end coverage: the real app in Chromium on an in-browser SQLite
 * built from the real migration files.
 *
 * Seeds go in through `addInitScript` so they land before `src/e2e/main.tsx`
 * renders — the entry reads them and applies them right after the migrations.
 */
const E2E_URL = "/e2e.html";

type Seed = { sql?: string[]; storage?: Record<string, unknown> };

async function boot(page: Page, seed: Seed = {}) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript((data: Seed) => {
    window.__E2E_SEED_SQL__ = data.sql ?? [];
    window.__E2E_SEED_STORAGE__ = data.storage ?? {};
  }, seed);

  await page.goto(E2E_URL);
  return errors;
}

/** A cashier whose hash matches the e2e `verify_password` shim (`plain:<pw>`). */
function cashierSql(name: string, password: string, role = "admin"): string {
  return `INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash)
          VALUES ('${name}', '${name}', '${role}', 'plain:${password}')`;
}

test.describe("boot", () => {
  test("runs every migration and shows first-run setup", async ({ page }) => {
    const errors = await boot(page);

    await expect(
      page.getByRole("heading", { name: "Selamat datang di Kassir" }),
    ).toBeVisible();

    // Every migration file applied without a single SQL error.
    expect(errors).toEqual([]);
  });

  test("shows the seeded cashier on the login screen", async ({ page }) => {
    const errors = await boot(page, { sql: [cashierSql("Raisya", "123456")] });

    await expect(page.getByRole("heading", { name: "Selamat datang 👋" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Raisya/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("login", () => {
  test("signs in and lands on beranda", async ({ page }) => {
    const errors = await boot(page, { sql: [cashierSql("Raisya", "123456")] });

    await page.getByRole("button", { name: /Raisya/ }).click();
    await page.getByLabel(/kata sandi/i).fill("123456");
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();
    await expect(page.getByText(/Selamat Datang/i)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("rejects a wrong password", async ({ page }) => {
    const errors = await boot(page, { sql: [cashierSql("Raisya", "123456")] });

    await page.getByRole("button", { name: /Raisya/ }).click();
    await page.getByLabel(/kata sandi/i).fill("wrong");
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page.getByText(/Kata sandi salah/i)).toBeVisible();
    expect(errors).toEqual([]);
  });
});
