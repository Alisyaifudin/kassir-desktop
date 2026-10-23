import { expect, test } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

const day = 86_400_000;
const now = Date.now();

function seed() {
  const sql: string[] = [cashierSql("Raisya", "123456")];
  sql.push(
    `INSERT INTO methods (method_id, method_name, method_kind, method_updated_at) VALUES ('mCash','Tunai','cash',1),('mQris','QRIS','qris',1)`,
  );
  sql.push(
    `INSERT INTO products (product_id, product_name, product_note, product_updated_at) VALUES ('p1','Kopi','',1)`,
  );
  let n = 0;
  for (let d = 0; d < 20; d++) {
    for (let k = 0; k < 3; k++) {
      n += 1;
      const at = now - d * day + k * 3_600_000;
      const method = k === 0 ? "mCash" : "mQris";
      sql.push(
        `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_credit_at, record_cashier, record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total, record_updated_at, record_sync_at, record_deleted_at, record_flag) VALUES ('r${n}', ${at}, ${at}, 0, NULL, 'Raisya', 'incoming', 100000, '', 0, '', '', 100000, 100000, ${at}, NULL, NULL, 0)`,
      );
      sql.push(
        `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id, product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price, record_listing_qty, record_listing_capital, record_listing_total) VALUES ('l${n}', 'g${n}', 'r${n}', NULL, 'p1', 'Kopi', 'retail', 1, 100000, 1, 60000, 100000)`,
      );
      sql.push(
        `INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay) VALUES ('m${n}', 'r${n}', '${method}', 100000)`,
      );
    }
  }
  return sql;
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page, { sql: seed() });
  await login(page, "Raisya", "123456");
});

test("cashflow keeps presets and gains a hand-picked range", async ({ page }) => {
  await page.goto("/e2e.html#/analytics");
  await expect(page.getByRole("button", { name: "30 hari" })).toBeVisible();
  const trigger = page.locator("header button").filter({ hasText: /–/ });
  await trigger.click();
  await expect(
    page.getByText("Pilih tanggal awal lalu tanggal akhir untuk rentang laporan."),
  ).toBeVisible();

  // Pick a day on each side: the period follows, and no preset reads as active.
  const calendars = page.getByRole("dialog").locator('div[style*="width"]');
  await calendars
    .nth(0)
    .getByRole("button", { name: /^1[0-9]$/ })
    .first()
    .click();
  await calendars
    .nth(1)
    .getByRole("button", { name: /^2[0-9]$/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  expect(page.url()).toContain("from=");
  // No preset claims the hand-picked period.
  const pressed = await page.locator('header button[aria-pressed="true"]').allInnerTexts();
  expect(pressed).not.toContain("30 hari");
});

test("payments shows full method names and no bucket width", async ({ page }) => {
  await page.goto("/e2e.html#/analytics/pembayaran");
  await expect(page.getByRole("heading", { name: "Komposisi pembayaran" })).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByRole("group", { name: "Lebar titik" })).toHaveCount(0);
  const names = await page.locator("section ul li").allInnerTexts();
  expect(names.join(" ")).toContain("Tunai");
  expect(names.join(" ")).toContain("QRIS");
  const fit = await page.evaluate(() =>
    Array.from(document.querySelectorAll("section ul li")).map((li) => {
      const name = li.querySelector("span span:last-child");
      return {
        text: name?.textContent,
        // scrollWidth > clientWidth means the name was clipped.
        clipped: name === null || name.scrollWidth > name.clientWidth + 1,
      };
    }),
  );
  expect(fit.every((row) => !row.clipped)).toBe(true);
});

test("time is one week at a time, with a remembered hour window", async ({ page }) => {
  await page.goto("/e2e.html#/analytics/waktu");
  await page.waitForTimeout(900);
  await expect(page.getByRole("group", { name: "Periode" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Lebar titik" })).toHaveCount(0);
  await expect(page.getByText("Transaksi per periode")).toHaveCount(0);

  const label = page.locator("header button").filter({ hasText: /–/ });
  const first = (await label.innerText()).trim();
  expect(first).toMatch(/^\d{2}-\d{2}-\d{4} – \d{2}-\d{2}-\d{4}$/);

  // The x labels are zero-padded ("08"); the y labels are not ("0", "2", …).
  const hourTicks = async () =>
    (
      await page
        .locator('[aria-label="Grafik transaksi per jam"] .recharts-cartesian-axis-tick-value')
        .allTextContents()
    ).filter((text) => /^\d{2}$/.test(text.trim()));

  await expect(page.getByRole("img", { name: "Grafik transaksi per jam" })).toBeVisible();
  await expect.poll(async () => (await hourTicks()).length, { timeout: 8000 }).toBe(13);
  console.log("hour ticks:", (await hourTicks()).join(","));

  // The window: two thumbs, persisted on release, applied to the histogram.
  const start = page.getByRole("slider", { name: "Jam mulai" });
  await start.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  const stored = await page.evaluate(() =>
    localStorage.getItem("kassir:store:analytics.hour-window"),
  );
  expect(JSON.parse(stored ?? "null")).toEqual([10, 21]);
  await expect.poll(async () => (await hourTicks()).length, { timeout: 8000 }).toBe(11);
  console.log("after drag:", (await hourTicks()).join(","));

  await page.reload();
  await page.waitForTimeout(1000);
  await expect.poll(async () => (await hourTicks()).length, { timeout: 8000 }).toBe(11);
  console.log("after reload:", (await hourTicks()).join(","));

  // A week forward moves the period by exactly seven days.
  const from = Number(new URL(page.url()).hash.split("from=")[1]?.split("&")[0]);
  await page.getByRole("button", { name: "Minggu berikutnya" }).click();
  await page.waitForTimeout(600);
  const nextFrom = Number(new URL(page.url()).hash.split("from=")[1]?.split("&")[0]);
  expect(nextFrom - from).toBe(7 * day);
});
