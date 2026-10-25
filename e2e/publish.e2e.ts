import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql } from "./harness";

/**
 * Publishing is a `product_flag` bit, not a delete: the switch in the product
 * detail header withdraws the product from the catalogue Pos and Restock share,
 * and flipping it back restores it.
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

async function login(page: Page) {
  await page.getByRole("button", { name: /Raisya/ }).click();
  await page.getByLabel(/kata sandi/i).fill("123456");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();
}

/** Hash navigation, not `goto`: a reload restarts the in-browser database. */
function go(page: Page, hash: string) {
  return page.evaluate((next) => {
    window.location.hash = next;
  }, hash);
}

/** The catalogue card for a listing, as the Pos search draws it. */
function listingCard(page: Page) {
  return page.getByRole("button", { name: /Kopi.*tanpa kode/ });
}

test("a withdrawn product disappears from the Pos catalogue and returns", async ({ page }) => {
  const errors = await boot(page, { sql: seed });
  await login(page);
  await go(page, "#/products/p1");

  const toggle = page.getByRole("switch");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Terbit di kasir")).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Tidak terbit")).toBeVisible();

  // The till no longer offers it: same catalogue, no listing.
  await go(page, "#/pos");
  await page.getByPlaceholder(/Cari barang/i).fill("Kopi");
  await expect(listingCard(page)).toHaveCount(0);

  // Publishing again puts it back without a reload.
  await go(page, "#/products/p1");
  await page.getByRole("switch").click();
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");

  await go(page, "#/pos");
  await page.getByPlaceholder(/Cari barang/i).fill("Kopi");
  await expect(listingCard(page).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test("a non-admin cannot publish", async ({ page }) => {
  const errors = await boot(page, {
    sql: [cashierSql("Raisya", "123456", "user"), ...seed.slice(1)],
  });
  await login(page);
  await go(page, "#/products/p1");

  await expect(page.getByText("Kopi").first()).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("the products list greys out a withdrawn product and labels it", async ({ page }) => {
  const errors = await boot(page, {
    sql: [
      cashierSql("Raisya", "123456"),
      // Two products, identical but for the flag: one sellable, one withdrawn.
      ...seed.slice(1),
      `INSERT INTO products (product_id, product_name, product_note, product_flag, product_updated_at)
         VALUES ('p2', 'Teh', '', 1, 1)`,
      `INSERT INTO listings (
         listing_id, product_id, listing_name, listing_price, listing_unit,
         listing_kind, listing_updated_at
       ) VALUES ('l2', 'p2', 'Teh', 5000, 1, 'retail', 1)`,
    ],
  });
  await login(page);

  // Grid: only the withdrawn card is labelled.
  await go(page, "#/products");
  await expect(page.getByText("Kopi", { exact: true })).toBeVisible();
  await expect(page.getByText("Tidak terbit", { exact: true })).toHaveCount(1);

  // Table: the same label, and the row is tinted — the state is not carried by
  // the badge alone.
  await go(page, "#/products?view=table");
  const withdrawn = page.getByRole("row", { name: /Teh/ });
  await expect(withdrawn.getByText("Tidak terbit", { exact: true })).toBeVisible();
  const tint = await withdrawn.evaluate((element) => getComputedStyle(element).backgroundColor);
  const publishedTint = await page
    .getByRole("row", { name: /Kopi/ })
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(tint).not.toBe(publishedTint);

  expect(errors).toEqual([]);
});
