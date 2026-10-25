import { expect, test } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * Beranda after the page-data migration: the header, the menu and both card
 * frames are static, and the figures, the ledger rows and the pockets are
 * independent keys that no longer wait for each other.
 */

const now = Date.now();
const day = 86_400_000;

/** One sale today, and a credit from yesterday that is still outstanding. */
const RECORDS = [
  `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_credit_at, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at, record_deleted_at, record_flag)
   VALUES ('r1', ${now}, ${now}, 0, NULL, 'Raisya', 'incoming', 125000, '', 0, '', '', 125000, 125000, ${now}, NULL, NULL, 0)`,
  `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id, product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price, record_listing_qty, record_listing_capital, record_listing_total)
   VALUES ('l1', 'g1', 'r1', NULL, NULL, 'Kopi', 'retail', 1, 125000, 1, 60000, 125000)`,
  `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_credit_at, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at, record_deleted_at, record_flag)
   VALUES ('r2', ${now - day}, NULL, 0, ${now - day}, 'Raisya', 'incoming', 0, '', 0, 'Budi', '', 80000, 80000, ${now - day}, NULL, NULL, 0)`,
];

/** The till's pockets: a different service, and a different key. */
const POCKETS = [
  `INSERT INTO pockets (pocket_id, pocket_name, pocket_type, pocket_ordering, pocket_updated_at)
   VALUES ('pCash', 'Kas Toko', 'absolute', 0, 1)`,
  `INSERT INTO money (money_id, timestamp, money_value, pocket_id, money_note, money_updated_at)
   VALUES ('m1', 1, 250000, 'pCash', '', 1)`,
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...POCKETS, ...RECORDS] });
  await login(page, "Raisya", "123456");
});

test("beranda paints its chrome before any figure, then fills each region", async ({ page }) => {
  // Nothing global is gated: greeting, menu tiles and both card heads (with their
  // actions) are on screen from the first frame.
  await expect(page.getByText("Selamat datang, Raisya")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "alt+0 Toko Jual ke pelanggan" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Transaksi hari ini" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Riwayat", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Uang" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kelola" })).toBeVisible();

  // The band: two summaries (today + yesterday for the delta) and the credit.
  await expect(page.getByText("Masuk hari ini")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Rp 125.000").first()).toBeVisible();
  await expect(page.getByText("Utang berjalan")).toBeVisible();
  await expect(page.getByText("1 catatan belum lunas")).toBeVisible();

  // The ledger's own key: one row and the footer count, inside its own card.
  const ledger = page.locator("section", {
    has: page.getByRole("heading", { name: "Transaksi hari ini" }),
  });
  await expect(ledger.getByText("1 transaksi")).toBeVisible();
  await expect(ledger.getByRole("link", { name: /125\.000/ })).toBeVisible();

  // The pockets' own key, read by another service on its own schedule.
  await expect(page.getByText("Kas Toko")).toBeVisible();
  await expect(page.getByText("Rp 250.000")).toBeVisible();
});

test("a cashier sees the day but not the till's balances", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Budi", "123456", "user"), ...POCKETS, ...RECORDS] });
  await login(page, "Budi", "123456");

  await expect(page.getByText("Selamat datang, Budi")).toBeVisible();
  // The day still answers, and only the day.
  await expect(page.getByText("Masuk hari ini")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Utang berjalan")).toBeVisible();
  // No money card, and no menu tile that would lead to one either.
  await expect(page.getByRole("heading", { name: "Uang" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Kelola" })).toHaveCount(0);
});
