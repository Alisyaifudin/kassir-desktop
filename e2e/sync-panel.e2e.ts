import { expect, test } from "@playwright/test";
import { boot, cashierSql, loginAndSettle } from "./harness";

/**
 * Sinkronisasi is now eight groups, not one.
 *
 * The panel renders a bar per group from `SYNC_IDLE.groups` before any run, so
 * this asserts the whole catalogue is on screen (and that the screen still boots
 * against the real migration set, including the bookmark/park tables).
 */
const GROUPS = [
  "Kas & Uang",
  "Pelanggan",
  "Pemasok",
  "Metode Pembayaran",
  "Media Sosial",
  "Biaya Tambahan",
  "Produk & Stok",
  "Catatan Transaksi",
];

test("Sinkronisasi lists every synced group, one bar each", async ({ page }) => {
  const errors = await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await loginAndSettle(page, "Raisya", "123456");

  await page.evaluate(() => {
    window.location.hash = "#/setting/sync";
  });

  await expect(page.getByRole("heading", { name: "Sinkronisasi", level: 1 })).toBeVisible();

  for (const label of GROUPS) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  // One progress bar per group, and no run has started.
  await expect(page.getByRole("progressbar")).toHaveCount(GROUPS.length);
  await expect(page.getByRole("button", { name: /^Sinkronisasi$/ })).toBeDisabled();

  expect(errors).toEqual([]);
});
