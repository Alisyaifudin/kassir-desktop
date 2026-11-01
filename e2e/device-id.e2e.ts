import { expect, test } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * The device id on the Settings screen.
 *
 * It exists so a shop can read it out when sync misbehaves: the server's log names
 * a till by this id (kassir-backend/docs/LOGS.md), so the number on the screen and
 * the row in the log have to be the same string. That is the one thing a component
 * test cannot check — it renders against a stub — so it is checked here, in the
 * real app, against the store key the sync itself reads.
 */

/** `StoreBrowserLive` keys its entries the way `plugin-store` does. */
const deviceSeed = (id: string) => ({ "kassir:store:sync.device_id": id });
const DEVICE = "4f1c9e2a-1111-4222-8333-444455556666";

test("the stored device id is what Settings shows", async ({ page }) => {
  const errors = await boot(page, {
    sql: [cashierSql("Raisya", "123456")],
    storage: deviceSeed(DEVICE),
  });
  await login(page, "Raisya", "123456");

  await page.evaluate(() => {
    window.location.hash = "#/setting";
  });

  const id = page.getByText(DEVICE);
  await expect(id).toBeVisible();
  await expect(page.getByText("ID perangkat")).toBeVisible();
  // The same string the sync sends as `X-Kassir-Device-Id`.
  await expect(id).toHaveAttribute("title", DEVICE);
  expect(errors).toEqual([]);
});

test("an id is minted for a device that has never synced", async ({ page }) => {
  // The case support actually meets: nothing has ever synced, and the operator is
  // asked for an id anyway. An empty line would send them looking in the wrong place.
  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await login(page, "Raisya", "123456");

  await page.evaluate(() => {
    window.location.hash = "#/setting";
  });

  const id = page.getByTitle(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  await expect(id).toBeVisible();

  // Minting is persisted, so the next screen read — and the next sync — agree.
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("kassir:store:sync.device_id");
    return raw === null ? null : (JSON.parse(raw) as unknown);
  });
  expect(stored).toBe(await id.textContent());
});
