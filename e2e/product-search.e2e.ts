import { expect, test, type Page } from "@playwright/test";
import { boot, cashierSql } from "./harness";

/**
 * The products search: a scanned code lands whole, and a burst of typing or
 * deleting writes the URL once — not once per keystroke.
 *
 * The bar used to be wired straight to the router, so every character was a
 * navigation and a page render. Two things went wrong there, both here:
 *
 *   * a barcode wedge types thirteen digits in a few dozen milliseconds, and the
 *     field kept being rendered back down to a query the router had not caught
 *     up with — two or three characters survived;
 *   * `Backspace` was a page render per deletion.
 *
 * What is measured now is the mechanism, not the clock: the field holds the
 * whole burst the moment it ends, and the history is written exactly once (after
 * `SEARCH_DELAY`), never mid-burst with a half-typed prefix. The writes are
 * counted by patching `history.replaceState` in the page — react-router calls it
 * on the instance, so the hook sees every navigation, including the ones a
 * transition defers.
 */
const CODE = "8991002101234";

const seed = [
  cashierSql("Raisya", "123456"),
  `INSERT INTO products (product_id, product_name, product_note, product_updated_at)
     VALUES ('p1', 'Kopi Susu', '', 1),
            ('p2', 'Susu Murni', '', 1),
            ('p3', 'Teh Melati', '', 1)`,
  `INSERT INTO listings (
     listing_id, product_id, listing_name, listing_price, listing_unit,
     listing_kind, listing_code, listing_updated_at
   ) VALUES ('l1', 'p1', 'Kopi Susu', 10000, 1, 'retail', '${CODE}', 1),
            ('l2', 'p2', 'Susu Murni', 12000, 1, 'retail', '1112223334445', 1),
            ('l3', 'p3', 'Teh Melati', 8000, 1, 'retail', NULL, 1)`,
  `INSERT INTO stocks (
     stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
   ) VALUES ('s1', 'p1', 15, 5000, 1, 1),
            ('s2', 'p2', 8, 6000, 1, 1),
            ('s3', 'p3', 20, 3000, 1, 1)`,
];

async function openProducts(page: Page) {
  const errors = await boot(page, { sql: seed });

  await page.getByRole("button", { name: /Raisya/ }).click();
  await page.getByLabel(/kata sandi/i).fill("123456");
  await page.getByRole("button", { name: /masuk/i }).click();
  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Produk", exact: true }).click();
  await expect(page).toHaveURL(/#\/products/);

  // The whole catalogue, so a filter that hides something is visible.
  await expect(page.getByRole("link", { name: "Buka Kopi Susu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka Susu Murni" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka Teh Melati" })).toBeVisible();

  return errors;
}

const search = (page: Page) => page.getByPlaceholder(/Cari produk/);
const card = (page: Page, name: string) => page.getByRole("link", { name: `Buka ${name}` });

/** Records every distinct URL react-router replaces into history. */
async function watchUrlWrites(page: Page) {
  await page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { __writes: string[] }).__writes = log;
    let last = location.href;
    const original = history.replaceState.bind(history);
    history.replaceState = (state: unknown, title: string, url?: string | URL | null) => {
      const next = new URL(String(url ?? location.href), location.href).href;
      if (next !== last) {
        last = next;
        log.push(next);
      }
      return original(state, title, url as string | URL | null);
    };
  });
}

/** The writes so far; `clearWrites` starts a fresh measurement window. */
const writes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __writes: string[] }).__writes);
const clearWrites = (page: Page) =>
  page.evaluate(() => {
    const log = (window as unknown as { __writes: string[] }).__writes;
    log.length = 0;
  });

test("a scanned code lands whole, filters the catalogue, and writes the URL once", async ({
  page,
}) => {
  const errors = await openProducts(page);
  await watchUrlWrites(page);

  const bar = search(page);
  await expect(bar).toBeFocused();

  // A wedge: thirteen digits, as fast as they come, no pause anywhere.
  await bar.pressSequentially(CODE, { delay: 0 });

  // Nothing was swallowed and nothing was rendered back over it.
  await expect(bar).toHaveValue(CODE);

  // No mid-burst write: a write per keystroke would have left the URL holding a
  // prefix of the code.
  const during = await writes(page);
  expect(during.filter((url) => url.includes("q=") && !url.includes(CODE))).toEqual([]);

  // One write for the whole scan, after the pause...
  await expect.poll(async () => (await writes(page)).length).toBe(1);
  expect(page.url()).toContain(`q=${CODE}`);

  // ...the field keeps what was scanned (the echo does not rewind it)...
  await expect(bar).toHaveValue(CODE);

  // ...and the catalogue is the one product the code belongs to.
  await expect(card(page, "Kopi Susu")).toBeVisible();
  await expect(card(page, "Susu Murni")).toHaveCount(0);
  await expect(card(page, "Teh Melati")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("deleting is immediate in the field and writes the URL once per pause", async ({ page }) => {
  const errors = await openProducts(page);
  const bar = search(page);

  await bar.pressSequentially("kopi susu", { delay: 0 });
  await expect(bar).toHaveValue("kopi susu");
  await expect(card(page, "Kopi Susu")).toBeVisible();
  await expect(card(page, "Teh Melati")).toHaveCount(0);

  await watchUrlWrites(page);

  // Three deletions as fast as a held `Backspace` produces them.
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");

  // The field keeps up with every one of them...
  await expect(bar).toHaveValue("kopi s");
  // ...and none of them was a page render of its own: one write, after the pause.
  await expect.poll(async () => (await writes(page)).length).toBe(1);
  expect(page.url()).toMatch(/q=kopi(\+|%20)s$/);
  // The echo of that write does not rewind the field either.
  await expect(bar).toHaveValue("kopi s");

  // Clearing it out brings the whole catalogue back.
  await clearWrites(page);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press("Backspace");
  await expect(bar).toHaveValue("");
  await expect.poll(() => page.url()).not.toContain("q=");
  await expect(card(page, "Kopi Susu")).toBeVisible();
  await expect(card(page, "Susu Murni")).toBeVisible();
  await expect(card(page, "Teh Melati")).toBeVisible();

  expect(errors).toEqual([]);
});
