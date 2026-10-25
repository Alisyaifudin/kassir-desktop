import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * `/pos` with the page-data cache on.
 *
 * The till is the first real page to opt in, and the one where the cache has to
 * be *narrow*: `methods`, `customers` and `extras` are catalogs, but `drafts` is
 * the screen's own working state — the "always keep a cart open" rule writes a
 * row when that list is empty, and the tab it opens comes from that same list.
 * It is skipped (`cache: { skip: ["drafts"] }`).
 *
 * So this pins the property the `skip` exists for: a return visit reopens the
 * **same** cart, with its line, and does not race a second draft into existence.
 * Nothing here asserts a colour or a timing — only that the till behaves.
 */
const seed = [
  cashierSql("Raisya", "123456"),
  `INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
     VALUES ('cash', 'Tunai', 'cash', 1)`,
  `INSERT INTO products (product_id, product_name, product_note, product_updated_at)
     VALUES ('p1', 'Kopi', '', 1)`,
  `INSERT INTO listings (
     listing_id, product_id, listing_name, listing_price, listing_unit,
     listing_kind, listing_updated_at
   ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1)`,
  `INSERT INTO stocks (
     stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
   ) VALUES ('s1', 'p1', 15, 1000, 1, 1)`,
];

async function openTill(page: Page) {
  await boot(page, { sql: seed });
  await login(page, "Raisya", "123456");
  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Toko", exact: true }).click();
  await expect(page).toHaveURL(/#\/pos/);
  // The screen always ends up with one open cart.
  await expect(page.getByRole("tab")).toHaveCount(1, { timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("a return visit reopens the same cart, with its line intact", async ({ page }) => {
  await openTill(page);

  // Put something in the cart, so "did we come back to the same cart?" is a real
  // question rather than an empty-tab comparison.
  await page.getByPlaceholder(/Cari barang/i).fill("Kopi");
  await page
    .getByRole("button", { name: /Kopi.*tanpa kode/ })
    .first()
    .click();
  await expect(page.getByText("Kopi").first()).toBeVisible();

  // Leave the till and come back: this is the visit whose catalog keys are in
  // the store, and whose `drafts` key still has to be read.
  await page.getByRole("button", { name: "Beranda", exact: true }).click();
  await page.getByRole("button", { name: "Toko", exact: true }).click();
  await expect(page).toHaveURL(/#\/pos/);

  // One cart, not two: a seeded draft list acted on in the first frame would
  // have made the "no open cart, create one" rule fire.
  await expect(page.getByRole("tab")).toHaveCount(1, { timeout: 5000 });
  // And it is the same cart: the line survived the trip.
  await expect(page.getByText("Kopi").first()).toBeVisible();
  // The strip still prices it, so the cached catalogs did not starve the screen.
  await expect(page.getByText("10.000", { exact: false }).first()).toBeVisible();
});
