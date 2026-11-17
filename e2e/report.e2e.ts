import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { boot, brand, cashierSql, loginAndSettle, navTab } from "./harness";

/**
 * `/report`, phase 5: the shell and its states.
 *
 * What is worth asserting here is the part the unit tests cannot reach — that the
 * screen boots against the real schema (migration 63), that **Buat laporan**
 * actually writes and the whole screen re-reads off *both* revision counters, and
 * that the admin gate holds. The classifier and the PDF viewer are phases 6 and 7.
 */

/**
 * Open the report the way a person does: from its tile on Beranda.
 *
 * There is deliberately no `/report` tab in the top bar — the report is the
 * owner's once-a-day screen, not one the till moves between — so a test that
 * looked for one would be asserting a behaviour the app does not have.
 */
async function openReport(page: Page) {
  // By `href`, not by name: a menu tile's accessible name is assembled from its
  // pieces — "admin Laporan Klasifikasi dan cetak" — so a name selector would have
  // to know that composition and would break the day a badge changes.
  await page.locator('main a[href="#/report"]').click();
  await expect(page).toHaveURL(/#\/report$/);
}

const now = Date.now();
const hour = 3_600_000;

/** One sale (two goods lines and an Ongkir) and one purchase. */
const DAY = [
  `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_credit_at, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at, record_deleted_at, record_flag)
   VALUES ('r1', ${now - 2 * hour}, ${now - 2 * hour}, 0, NULL, 'Raisya', 'incoming', 45000, '', 0, 'Budi', '', 40000, 45000, ${now - 2 * hour}, NULL, NULL, 0)`,
  `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id, product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price, record_listing_qty, record_listing_capital, record_listing_total)
   VALUES ('l1', 'g1', 'r1', NULL, NULL, 'Hanasui', 'retail', 1, 20000, 1, 12000, 20000)`,
  `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id, product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price, record_listing_qty, record_listing_capital, record_listing_total)
   VALUES ('l2', 'g2', 'r1', NULL, NULL, 'Roti Bakar', 'retail', 1, 20000, 1, 9000, 20000)`,
  `INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, record_extra_value, record_extra_eff, record_extra_kind, record_extra_flag)
   VALUES ('e1', 'Ongkir', 'r1', 5000, 5000, 'number', 0)`,
  `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_credit_at, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at, record_deleted_at, record_flag)
   VALUES ('r2', ${now - hour}, ${now - hour}, 0, NULL, 'Raisya', 'outcoming', 30000, '', 0, '', '', 30000, 30000, ${now - hour}, NULL, NULL, 0)`,
  `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id, product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price, record_listing_qty, record_listing_capital, record_listing_total)
   VALUES ('l3', 'g3', 'r2', NULL, NULL, 'Kardus', 'retail', 1, 30000, 1, 30000, 30000)`,
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("the day's rail and the split totals come from the real schema", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...DAY] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);

  // One row per record, in chronological order.
  await expect(page.getByRole("option")).toHaveCount(2);
  // Each direction is totalled on its own — never summed into one figure.
  await expect(page.getByText("Rp45.000")).toBeVisible();
  await expect(page.getByText("Rp30.000")).toBeVisible();
  // Both records are unclassified, so both are marked and the counter says four
  // lines (two goods, one Ongkir, one purchase).
  await expect(page.getByText("4 dari 4 baris belum jelas")).toBeVisible();
});

test("Buat laporan seeds every line and the whole screen re-reads", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...DAY] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);

  await page.getByRole("button", { name: /buat laporan/i }).click();

  // The write lands, and *both* subscription chains notice: the counter (a report
  // read) and the rail's dots (the same read, per record). The three goods lines
  // are filled in; the Ongkir is left as the operator's question — which is the
  // whole point of the screen.
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("button", { name: /buat laporan/i })).toHaveCount(0);
  await expect(page.getByText("Pilih rekaman di sebelah kiri")).toBeVisible();

  // What was written survives leaving and coming back, which re-mounts the page and
  // re-reads from the database rather than from anything the click left in memory.
  await navTab(page, "/records").click();
  // The report opens from its Beranda tile, so the way back is Beranda.
  await brand(page).click();
  await openReport(page);
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible({ timeout: 5000 });
});

test("picking a record opens it, and the Laporan tab swaps the pane", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...DAY] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);
  await page.getByRole("button", { name: /buat laporan/i }).click();
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible({ timeout: 5000 });

  await page.getByRole("option").first().click();
  await expect(page).toHaveURL(/#\/report\?.*selected=/);
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "Laporan", exact: true }).click();
  await expect(page).toHaveURL(/#\/report\?.*view=laporan/);

  // The report's own chrome: the period tabs and both downloads.
  for (const tab of ["Hari", "Minggu", "Bulan", "Kuartal", "Tahun"]) {
    await expect(page.getByRole("button", { name: tab, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /PDF/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /JSON/ })).toBeVisible();

  // The PDF itself is drawn by Rust, which this harness does not run (no Tauri
  // process) — so what is asserted here is that a failed render is *reported* in
  // the pane instead of leaving it blank. The layout is `cargo test`'s job.
  await expect(
    page.getByText(/PDF gagal disiapkan|Belum ada/).first(),
  ).toBeVisible({ timeout: 5000 });
});

test("an empty day offers no report to make", async ({ page }) => {
  // Migration 63 creates the report tables, so this is the prompt's own logic and
  // not a schema failure: nothing happened, so there is nothing to classify.
  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);

  await expect(page.getByText("Tidak ada transaksi pada hari ini")).toBeVisible();
  await expect(page.getByRole("button", { name: /buat laporan/i })).toHaveCount(0);
});

test("a cashier is sent back — the report is the owner's screen", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Budi", "123456", "user"), ...DAY] });
  await loginAndSettle(page, "Budi", "123456");

  // No tab to start with…
  await expect(navTab(page, "/report")).toHaveCount(0);

  // …and typing the URL does not sneak past `AdminOnly` either.
  await page.goto("/e2e.html#/report");
  await expect(page).toHaveURL(/#\/records/, { timeout: 5000 });
  await expect(page.getByRole("button", { name: "Klasifikasi" })).toHaveCount(0);
});

test("the classifier shows every line, and one pick writes without a save button", async ({
  page,
}) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...DAY] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);
  await page.getByRole("button", { name: /buat laporan/i }).click();
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible({ timeout: 5000 });

  await page.getByRole("option").first().click();

  // Two goods lines and the Ongkir, each with its own cell. The goods were filled
  // in by direction (a guess); the charge was not touched, because a free-text
  // name says nothing the app may assume.
  await expect(page.getByLabel("Kategori")).toHaveCount(3);
  await expect(page.locator('[data-classification="guess"]')).toHaveCount(2);
  await expect(page.locator('[data-classification="missing"]')).toHaveCount(1);
  await expect(page.getByText("Rek. 1/2")).toBeVisible();

  // Answer the Ongkir: no save button, the pick *is* the write.
  const ongkir = page.getByLabel("Kategori").nth(2);
  await ongkir.click();
  await page.getByRole("option", { name: "Ongkir" }).click();

  await expect(page.locator('[data-classification="chosen"]')).toHaveCount(1, {
    timeout: 5000,
  });
  await expect(page.locator('[data-classification="missing"]')).toHaveCount(0);
  // Answering the day's only outstanding line makes the header say so.
  await expect(page.getByText("Semua baris sudah jelas")).toBeVisible({ timeout: 5000 });
});

test("‹ › walks the day, and stops at both ends", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...DAY] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);
  await page.getByRole("button", { name: /buat laporan/i }).click();
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible({ timeout: 5000 });

  await page.getByRole("option").first().click();
  await expect(page.getByText("Rek. 1/2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rekaman sebelumnya" })).toBeDisabled();

  await page.getByRole("button", { name: "Rekaman berikutnya" }).click();
  await expect(page.getByText("Rek. 2/2")).toBeVisible();
  // The second record is the purchase, so its single line defaulted to Beli.
  await expect(page.getByLabel("Kategori")).toHaveCount(1);
  await expect(page.getByLabel("Kategori").first()).toHaveValue("Beli");
  await expect(page.getByRole("button", { name: "Rekaman berikutnya" })).toBeDisabled();
});

test("a category the list does not hold is typed straight into the cell", async ({ page }) => {
  // The classifier must not send the operator to another screen to mint a
  // category: typing a name that is not in the list and pressing Enter *is*
  // adding it, and the line takes it.
  await boot(page, { sql: [cashierSql("Raisya", "123456"), ...DAY] });
  await loginAndSettle(page, "Raisya", "123456");
  await openReport(page);
  await page.getByRole("button", { name: /buat laporan/i }).click();
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible({ timeout: 5000 });

  await page.getByRole("option").first().click();
  const ongkir = page.getByLabel("Kategori").nth(2);
  await ongkir.click();
  await ongkir.fill("Penyesuaian");

  // Typing must not have filed anything yet — the field's text is not a category.
  await expect(page.getByText("1 dari 4 baris belum jelas")).toBeVisible();

  // The create row offers the words, and Enter takes it.
  await expect(page.getByText("Tambahkan kategori: Penyesuaian")).toBeVisible();
  await ongkir.press("Enter");

  // The cell now reads the new name, and the day is done.
  await expect(page.getByLabel("Kategori").nth(2)).toHaveValue("Penyesuaian", { timeout: 5000 });
  await expect(page.locator('[data-classification="missing"]')).toHaveCount(0);
  await expect(page.getByText("Semua baris sudah jelas")).toBeVisible({ timeout: 5000 });
});

test("categories: the built-ins are protected, the shop's own are fully its own", async ({
  page,
}) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await loginAndSettle(page, "Raisya", "123456");

  // Reached from the report screen's own button.
  await page.goto("/e2e.html#/report");
  await page.getByRole("link", { name: /Kategori/ }).click();
  await expect(page).toHaveURL(/#\/report\/categories/);
  // `main`, because the topbar's route title is the same words as a heading.
  await expect(
    page.locator("main").getByRole("heading", { name: "Kategori Laporan" }),
  ).toBeVisible();

  // Six built-ins plus `abaikan`, every one badged, none deletable.
  await expect(page.getByText("bawaan")).toHaveCount(7);
  await expect(page.getByRole("button", { name: /^Hapus/ })).toHaveCount(0);

  // Add one of the shop's own.
  await page.getByRole("button", { name: "Tambah" }).click();
  await page.getByPlaceholder("Nama").fill("Penyesuaian");
  await page.getByRole("button", { name: "Tambah", exact: true }).last().click();
  await expect(page.getByLabel("Nama kategori Penyesuaian")).toBeVisible({ timeout: 5000 });
  // The built-ins cannot be deleted; this one can.
  await expect(page.getByRole("button", { name: "Hapus Penyesuaian" })).toBeVisible();

  // Rename it in place.
  await page.getByLabel("Nama kategori Penyesuaian").fill("Penyesuaian Bulanan");
  await page.getByLabel("Nama kategori Penyesuaian").press("Enter");
  await expect(page.getByLabel("Nama kategori Penyesuaian Bulanan")).toBeVisible({
    timeout: 5000,
  });

  // And soft-delete it.
  await page.getByRole("button", { name: "Hapus Penyesuaian Bulanan" }).click();
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByLabel("Nama kategori Penyesuaian Bulanan")).toHaveCount(0, {
    timeout: 5000,
  });
});
