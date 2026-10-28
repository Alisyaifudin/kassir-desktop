import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql } from "./harness";

/**
 * Closing "Pembelian berhasil" hands the goods stage back.
 *
 * This is the case the bun tests cannot see. They flush every promise and effect
 * with `act()` before they look, so the close path is only ever observed after it
 * has settled — while the bug lived *in* the settling. In Chromium the scheduler
 * is real: the stage write is a router navigation (react-router wraps it in
 * `startTransition`), the replacement cart's id arrives from `transaction.add.new`
 * a tick later, and the two used to rebuild the same query string from the copies
 * their hooks had been handed when they rendered. The second write put
 * `?stage=payment` back and, being the router's last navigation, won: the dialog
 * closed onto the payment grid and stayed there.
 *
 * The stage is React state now, mirrored to the URL, so the goods come back on
 * the next commit regardless of which navigation lands first.
 */
const seed = [
  cashierSql("Raisya", "123456"),
  `INSERT INTO products (product_id, product_name, product_note, product_updated_at)
     VALUES ('p1', 'Kopi', '', 1)`,
  `INSERT INTO listings (
     listing_id, product_id, listing_name, listing_price, listing_unit,
     listing_kind, listing_updated_at
   ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1)`,
  `INSERT INTO stocks (
     stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
   ) VALUES ('s1', 'p1', 15, 6000, 1, 1)`,
];

async function openRestock(page: Page) {
  const errors = await boot(page, { sql: seed });

  await page.getByRole("button", { name: /Raisya/ }).click();
  await page.getByLabel(/kata sandi/i).fill("123456");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Stok", exact: true }).click();
  await expect(page).toHaveURL(/#\/restock/);

  return errors;
}

const search = (page: Page) => page.getByPlaceholder(/Cari barang untuk dibeli/i);
const tender = (page: Page) => page.locator("#cell-payment-amount");

test("the goods come back after the completion dialog closes", async ({ page }) => {
  const errors = await openRestock(page);

  await search(page).fill("Kopi");
  await page
    .getByRole("button", { name: /Kopi.*tanpa kode/ })
    .first()
    .click();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);

  // Goods -> charges -> payment.
  await page.getByRole("button", { name: /Berikutnya/ }).click();
  await page.getByRole("button", { name: /Berikutnya/ }).click();
  await expect(page.getByRole("button", { name: "Bayar" })).toBeVisible();

  // Tendering from the amount cell; Enter pays the purchase.
  await tender(page).click();
  await page.locator("#payment-amount-0").fill("10000");
  await page.locator("#payment-amount-0").press("Enter");
  await expect(page.getByRole("heading", { name: "Pembelian berhasil" })).toBeVisible();

  await page.getByRole("button", { name: /close/i }).click();

  // The goods, on the commit that closes the dialog — not "eventually, after
  // some navigation catches up".
  await expect(tender(page)).toHaveCount(0);
  await expect(search(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Bayar" })).toHaveCount(0);
  await expect(page).not.toHaveURL(/stage=payment/);

  // The new cart is the one open, and the goods grid is empty and ready.
  await expect(page.getByTestId("cart-line")).toHaveCount(0);
  await expect(page).toHaveURL(/draft=/);
  await expect(search(page)).toBeFocused();

  // Nothing may come back a moment later, once the draft has settled and the
  // tabs have been re-rendered.
  await page.waitForTimeout(600);
  await expect(search(page)).toBeVisible();
  await expect(tender(page)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("a refresh lands on the step the address bar names", async ({ page }) => {
  await openRestock(page);

  await search(page).fill("Kopi");
  await page
    .getByRole("button", { name: /Kopi.*tanpa kode/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Berikutnya/ }).click();
  await page.getByRole("button", { name: /Berikutnya/ }).click();
  await expect(tender(page)).toBeVisible();
  await expect(page).toHaveURL(/stage=payment/);

  // The stage is state now, but the URL is still how the screen is entered.
  await page.reload();

  await expect(tender(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Bayar" })).toBeVisible();
});

test("Sebelumnya still walks back from payment to the goods", async ({ page }) => {
  await openRestock(page);

  await search(page).fill("Kopi");
  await page
    .getByRole("button", { name: /Kopi.*tanpa kode/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Berikutnya/ }).click();
  await page.getByRole("button", { name: /Berikutnya/ }).click();
  await expect(tender(page)).toBeVisible();

  await page.getByRole("button", { name: /Sebelumnya/ }).click();
  await expect(tender(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/stage=payment/);

  await page.getByRole("button", { name: /Sebelumnya/ }).click();
  await expect(search(page)).toBeVisible();
});
