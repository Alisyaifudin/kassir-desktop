import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql } from "./harness";

/**
 * The sale flow: search the catalog, add a listing, watch the cart total.
 *
 * This is the first test that exercises a real domain query (`listing.get.search`)
 * against the real schema, plus the Decimal cart maths in `~/lib/purchase`.
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

async function openPos(page: Page) {
  const errors = await boot(page, { sql: seed });

  await page.getByRole("button", { name: /Raisya/ }).click();
  await page.getByLabel(/kata sandi/i).fill("123456");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Toko", exact: true }).click();
  await expect(page).toHaveURL(/#\/pos/);

  return errors;
}

/** Types a query and clicks the catalog card for a listing. */
async function addListing(page: Page, query: string, name: string) {
  const search = page.getByPlaceholder(/Cari barang/i);
  await search.fill(query);
  // Wait for the *catalog* card, not a cart line: the result card carries the
  // "tanpa kode" fallback (this seed has no code), the cart line does not. The
  // search results arrive from an async query, so without this the click can
  // land on the still-mounted draft grid.
  await page
    .getByRole("button", { name: new RegExp(`${name}.*tanpa kode`) })
    .first()
    .click();
}

test("adds a listing to the cart and totals it", async ({ page }) => {
  const errors = await openPos(page);

  const total = page.getByTestId("grand-total");
  await expect(total).toHaveText("Rp0");

  await addListing(page, "Kopi", "Kopi");

  await expect(total).toHaveText("Rp10.000");
  // The cart line, not the catalog card: the search clears on pick.
  await expect(page.getByPlaceholder(/Cari barang/i)).toHaveValue("");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);

  expect(errors).toEqual([]);
});

test("bumps the existing line instead of adding a second one", async ({ page }) => {
  const errors = await openPos(page);

  await addListing(page, "Kopi", "Kopi");
  await expect(page.getByTestId("grand-total")).toHaveText("Rp10.000");

  // Picking the same listing again must increment qty, not duplicate the line.
  await addListing(page, "Kopi", "Kopi");
  await expect(page.getByTestId("grand-total")).toHaveText("Rp20.000");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);

  expect(errors).toEqual([]);
});

test("shows no results for an unknown query", async ({ page }) => {
  await openPos(page);

  await page.getByPlaceholder(/Cari barang/i).fill("tidak-ada-barang-ini");
  await expect(page.getByText("Tidak ada listing.")).toBeVisible();
});
