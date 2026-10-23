import { expect, test } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * The page-data pattern, in the real app.
 *
 * `/dev/page-data` serves five keys with deliberate latencies (profile 400 ms,
 * broken 800 ms, stats 1300 ms, feed 2600 ms). This test walks the arrival
 * order and checks the two things that matter: the page is usable before any key
 * answers, and each widget appears on its own key's schedule.
 */
test("page data gates settle independently", async ({ page }) => {
  const shots = process.env.PD_SHOTS === "1" ? "/tmp/pd" : null;

  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await login(page, "Raisya", "123456");
  await page.evaluate(() => {
    window.location.hash = "#/dev/page-data";
  });

  // 1. Static chrome is on screen before the page has finished loading: the card
  // frames and the status strip are there, and only widget bodies are skeletons.
  await expect(page.getByRole("heading", { name: "Page data playground" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profil kasir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aktivitas terbaru" })).toBeVisible();
  expect(await page.locator('[data-slot="skeleton"]').count()).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}-0-mount.png` });

  // 2. The static header is alive while keys are still in flight.
  const uptime = page.locator("header span.tabular-nums").first();
  const first = await uptime.textContent();
  await page.waitForTimeout(400);
  expect(await uptime.textContent()).not.toBe(first);

  // 3. The fastest key (~400 ms) fills in; the slowest (~2600 ms) is still a
  // skeleton. Counted without retrying, so this is a snapshot of one moment.
  await expect(page.getByText("Siti Rahma").first()).toBeVisible({ timeout: 3000 });
  expect(await page.getByText("Penjualan #A-1043 · Rp 128.000").count()).toBe(0);
  expect(await page.locator('[data-slot="skeleton"]').count()).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}-1-profile.png` });

  // 4. `stats` arrives; the two-key card (profile + stats) fills at the same time.
  await expect(page.getByText("Ringkasan hari ini")).toBeVisible();
  await expect(page.getByText("4.720.000", { exact: false }).first()).toBeVisible({
    timeout: 3000,
  });
  await expect(page.getByText("Profil + ringkasan")).toBeVisible();
  await expect(page.getByText("128 pesanan", { exact: false })).toBeVisible({ timeout: 3000 });
  expect(await page.getByText("Penjualan #A-1043 · Rp 128.000").count()).toBe(0);
  if (shots) await page.screenshot({ path: `${shots}-2-stats.png` });

  // 5. The slowest key lands last, and the failure stayed inside its own card.
  await expect(page.getByText("Penjualan #A-1043 · Rp 128.000")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("alert")).toContainText("503");
  await expect(page.getByText("menunggu", { exact: true })).toHaveCount(0);
  await expect(page.getByText("gagal", { exact: true })).toHaveCount(1);
  await expect(page.getByText("siap", { exact: true })).toHaveCount(5);
  if (shots) await page.screenshot({ path: `${shots}-3-all.png` });
});

/**
 * The write side: a mutation keeps the value on screen, flags the keys it
 * invalidates, and only those widgets say so.
 */
test("a mutation flags its keys as refetching while keeping the data", async ({ page }) => {
  const shots = process.env.PD_SHOTS === "1" ? "/tmp/pd" : null;

  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await login(page, "Raisya", "123456");
  await page.evaluate(() => {
    window.location.hash = "#/dev/page-data";
  });

  // Let the page settle on its first read.
  await expect(page.getByText("128", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.getByRole("button", { name: /tambah 3 pesanan/i }).click();

  // The write flags `stats`; the card keeps showing 128 while it refetches.
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible({ timeout: 1500 });
  await expect(page.getByText("128", { exact: true })).toBeVisible();
  // An unspecified key is untouched, so its card never goes busy.
  await expect(
    page.locator("section", { hasText: "Profil kasir" }).locator('[aria-busy="true"]'),
  ).toHaveCount(0);
  if (shots) await page.screenshot({ path: `${shots}-4-stale.png` });

  // New value, flag gone.
  await expect(page.getByText("131", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  if (shots) await page.screenshot({ path: `${shots}-5-refetched.png` });

  // A live key: the write pushes through the stream, so it never needs a refetch.
  await page.getByRole("button", { name: /catat aktivitas/i }).click();
  await expect(page.getByText("Aktivitas baru #1")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("status")).toHaveCount(0);
});
