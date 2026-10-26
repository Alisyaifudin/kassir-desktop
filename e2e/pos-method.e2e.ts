import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql } from "./harness";

/**
 * Choosing a payment method must close its menu, not bounce it open again.
 *
 * The method menu is a Radix `Select` inside a grid cell, and the cell treats a
 * click on itself as "open the editor". The menu is portaled, but React still
 * bubbles its events back through the tree, and Radix selects on `pointerup` and
 * closes *before* the trailing `click` lands. By then the render that ended
 * editing has run, so the cell read the stray click as a fresh one and reopened
 * the menu it had just closed — the popover came back and only a click outside
 * dismissed it.
 *
 * This is the case the unit test cannot see (happy-dom computes no animation
 * name, so Radix unmounts the menu immediately instead of holding it through
 * the exit animation where the stray click arrives). Chromium runs the real CSS,
 * so the sequence is the browser's.
 *
 * The four built-in methods (ids `1000`-`1003`, NULL names) already come from
 * the migrations, so the seed only adds an account: `BCA` inside `transfer`,
 * which is what puts an Akun cell next to the Metode cell.
 */
const seed = [
  cashierSql("Raisya", "123456"),
  `INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
     VALUES ('bca', 'BCA', 'transfer', 1)`,
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

/** One listing in the cart, so the strip is settling a real sale. */
async function addListing(page: Page) {
  await page.getByPlaceholder(/Cari barang/i).fill("Kopi");
  await page
    .getByRole("button", { name: /Kopi.*tanpa kode/ })
    .first()
    .click();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
}

/**
 * Picks an option and pins both halves of the bug: the value lands, the menu is
 * shut right away, and it is *still* shut once the exit animation has had time
 * to finish and a reopen would have shown up.
 */
async function chooseFrom(page: Page, cell: string, option: string, label: string) {
  const target = page.locator(cell);

  // One click selects the cell and opens its menu (no second click, no Enter).
  await target.click();
  await expect(page.getByRole("listbox")).toBeVisible();

  await page.getByRole("option", { name: option }).click();

  await expect(target).toContainText(label);
  await expect(page.getByRole("listbox")).toBeHidden();

  // The window in which the reopened menu would appear. Without the fix this is
  // where the popover came back, still covering the strip.
  await page.waitForTimeout(500);
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(target.locator('[aria-expanded]')).toHaveAttribute("aria-expanded", "false");
}

test("choosing a method closes its menu and leaves it closed", async ({ page }) => {
  const errors = await openPos(page);
  await addListing(page);

  await chooseFrom(page, "#cell-payment-kind", /^Transfer/, "Transfer");

  // The strip is still one method, not a summary, and the money row below it is
  // untouched ("Sisa": nothing has been paid yet) — the click did not fall
  // through to another cell on its way out.
  await expect(page.locator("#cell-payment-summary")).toHaveCount(0);
  await expect(page.getByText("Sisa", { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
});

test("choosing an account closes its menu and leaves it closed", async ({ page }) => {
  const errors = await openPos(page);
  await addListing(page);

  // `transfer` has an account, so choosing it grows an Akun cell beside it.
  await chooseFrom(page, "#cell-payment-kind", /^Transfer/, "Transfer");
  await expect(page.locator("#cell-payment-account")).toContainText("--Pilih--");

  await chooseFrom(page, "#cell-payment-account", /^BCA/, "BCA");

  expect(errors).toEqual([]);
});
