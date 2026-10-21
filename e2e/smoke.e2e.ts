import { expect, test } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * Boot and authentication against the real app in Chromium, on an in-browser
 * SQLite built from the real migration files.
 */

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

    await login(page, "Raisya", "123456");

    await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();
    await expect(page.getByText(/Selamat Datang/i)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("rejects a wrong password", async ({ page }) => {
    const errors = await boot(page, { sql: [cashierSql("Raisya", "123456")] });

    await login(page, "Raisya", "wrong");

    await expect(page.getByText(/Kata sandi salah/i)).toBeVisible();
    expect(errors).toEqual([]);
  });
});
