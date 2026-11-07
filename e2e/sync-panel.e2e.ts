import { expect, test } from "@playwright/test";
import { boot, cashierSql, loginAndSettle } from "./harness";

/**
 * Sinkronisasi is nine groups behind **one** bar.
 *
 * The run works one group at a time and the panel draws only the one being
 * worked on, so an idle screen has no bar at all — the group catalogue is the
 * intro paragraph, and the per-object detail is the log under it. This asserts
 * the idle screen says what it is (and that the page still boots against the
 * real migration set, bookmark/park tables included).
 */
const GROUPS = [
  "kas",
  "pelanggan",
  "pemasok",
  "metode pembayaran",
  "media sosial",
  "biaya tambahan",
  "produk dan stok",
  "paket combo",
  "catatan transaksi",
];

test("Sinkronisasi boots idle: one action, no bar, no error", async ({ page }) => {
  const errors = await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await loginAndSettle(page, "Raisya", "123456");

  await page.evaluate(() => {
    window.location.hash = "#/setting/sync";
  });

  await expect(page.getByRole("heading", { name: "Sinkronisasi", level: 1 })).toBeVisible();

  // Both actions are there, and neither is usable until a server and token are
  // stored — the panel's own rule, not the test's.
  const sync = page.getByRole("button", { name: /^Sinkronisasi$/ });
  const reset = page.getByRole("button", { name: /^Sinkronisasi Ulang$/ });
  await expect(sync).toBeVisible();
  await expect(reset).toBeVisible();
  await expect(sync).toBeDisabled();
  await expect(reset).toBeDisabled();

  // Idle: the status sentence, and the nine groups the run will visit.
  await expect(page.getByText("Siap", { exact: true })).toBeVisible();
  const intro = page.getByText(/Sinkronisasi berjalan manual/);
  for (const group of GROUPS) await expect(intro).toContainText(group);

  // Nothing is running, so the one bar has nothing to show.
  await expect(page.getByRole("progressbar")).toHaveCount(0);

  expect(errors).toEqual([]);
});
