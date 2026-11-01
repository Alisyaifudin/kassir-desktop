import { expect, test } from "@playwright/test";
import { boot, brand, cashierSql, login } from "./harness";

/**
 * The topbar's brand — the italic name beside the page title — is the name set
 * in Setting > Toko.
 *
 * It used to render `info.name`, a title-bar field with no editor left, so it
 * said "Toko" forever while Setting wrote `owner`: naming the shop changed the
 * paper and nothing else.
 */

const SHOP = "Warung Sumber Rejeki";

/** `StoreBrowserLive` keys its entries the way `plugin-store` does. */
const ownerSeed = (owner: string) => ({ "kassir:store:owner": owner });

test("a named shop is what the brand says", async ({ page }) => {
  const errors = await boot(page, {
    sql: [cashierSql("Raisya", "123456")],
    storage: ownerSeed(SHOP),
  });
  await login(page, "Raisya", "123456");

  await expect(page.getByRole("heading", { name: "Beranda", level: 1 })).toBeVisible();
  await expect(brand(page)).toHaveText(SHOP);
  expect(errors).toEqual([]);
});

test("an unnamed shop falls back to Toko", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await login(page, "Raisya", "123456");

  await expect(brand(page)).toHaveText("Toko");
});

test("saving the name repaints the brand without a reload", async ({ page }) => {
  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await login(page, "Raisya", "123456");
  await expect(brand(page)).toHaveText("Toko");

  // A hash navigation, not a goto: a reload would hide the thing under test.
  await page.evaluate(() => {
    window.location.hash = "#/setting/shop";
  });
  const name = page.getByLabel("Nama Toko");
  await expect(name).toBeVisible();
  await name.fill(SHOP);
  await page.getByRole("button", { name: /Simpan/ }).click();

  await expect(brand(page)).toHaveText(SHOP);
});

test("a long name does not push the topbar sideways", async ({ page }) => {
  await boot(page, {
    sql: [cashierSql("Raisya", "123456")],
    storage: ownerSeed("Warung Sumber Rejeki Cabang Pasar Baru Nomor Tujuh"),
  });
  await login(page, "Raisya", "123456");

  await expect(
    brand(page),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
