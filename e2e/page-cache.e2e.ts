import { expect, test } from "@playwright/test";
import { boot, cashierSql, login } from "./harness";

/**
 * The page-data cache, in the real app.
 *
 * `/dev/page-cache` mounts the *same* six keys twice: the left panel is the
 * layer as it ships (every mount reads), the right one opts into `pageCache`
 * (paint the last answer, read only when something invalidated it). A difference
 * between the two panels is therefore always the cache, never the data.
 *
 * What this pins, in order:
 *
 * 1. a return visit (unmount → remount, and a real route change) paints the
 *    cached panel instead of skeletons;
 * 2. a write nobody invalidated stays invisible to the cache — that is the trade
 *    the design makes — and one invalidation closes it;
 * 3. the invalidation reaches a page that is already mounted, not just the next
 *    visit.
 */
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await boot(page, { sql: [cashierSql("Raisya", "123456")] });
  await login(page, "Raisya", "123456");
  await page.evaluate(() => {
    window.location.hash = "#/dev/page-cache";
  });
  await expect(page.getByRole("heading", { name: "Page cache playground" })).toBeVisible();
});

const widget = (page: import("@playwright/test").Page, panel: "plain" | "cached", name: string) =>
  page.locator(`[data-panel="${panel}"] [data-widget="${name}"]`);

/** Both panels served the first read: nothing was cached yet. */
async function settleFirstRead(page: import("@playwright/test").Page) {
  await expect(widget(page, "cached", "Pesanan")).toContainText("128 pesanan", {
    timeout: 5000,
  });
  await expect(widget(page, "plain", "Pesanan")).toContainText("128 pesanan", {
    timeout: 5000,
  });
  await expect(widget(page, "cached", "Pesanan")).toHaveAttribute("data-paint", "baca");
  await expect(widget(page, "plain", "Pesanan")).toHaveAttribute("data-paint", "baca");
}

async function leaveAndReturn(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Lepas panel" }).click();
  await expect(page.getByText("Kedua panel dilepas.")).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke halaman" }).click();
}

test("a return visit paints the store instead of reading again", async ({ page }) => {
  await settleFirstRead(page);

  await leaveAndReturn(page);

  // The cached panel is data from the first frame — no skeleton, no read — while
  // its twin (same sources, no cache) starts over.
  await expect(widget(page, "cached", "Pesanan")).toHaveAttribute("data-paint", "cache");
  await expect(widget(page, "cached", "Pesanan")).toContainText("128 pesanan");
  await expect(widget(page, "cached", "Pesanan")).toContainText("<1 ms");
  await expect(widget(page, "plain", "Pesanan")).toHaveAttribute("data-paint", "baca");

  // The store is what it says it is: the key is in it, fresh, with a hit count.
  const inspector = page.getByTestId("cache-inspector");
  await expect(inspector).toContainText("orders");
  await expect(inspector.locator('[data-entry="orders"]')).toContainText("segar");

  // A real route change (not just a component remount) keeps it too.
  await page.getByRole("link", { name: /navigasi ke page-data/i }).click();
  await expect(page.getByRole("heading", { name: "Page data playground" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Page cache playground" })).toBeVisible();
  await expect(widget(page, "cached", "Pesanan")).toHaveAttribute("data-paint", "cache");
  await expect(widget(page, "cached", "Pesanan")).toContainText("128 pesanan");
});

test("a write is invisible until something invalidates it", async ({ page }) => {
  await settleFirstRead(page);

  // 1. A write nobody announced: no mounted panel moves, because nothing said
  //    the answer changed. This is the cost of explicit invalidation, on purpose.
  await page.getByRole("button", { name: "Tulis tanpa invalidasi" }).click();
  await leaveAndReturn(page);

  //    The cache still serves the old answer; the uncached panel reads the new one.
  await expect(widget(page, "cached", "Pesanan")).toHaveAttribute("data-paint", "cache");
  await expect(widget(page, "cached", "Pesanan")).toContainText("128 pesanan");
  await expect(widget(page, "plain", "Pesanan")).toContainText("133 pesanan", { timeout: 5000 });

  // 2. The same write, announced: the mounted cached panel revalidates on the
  //    spot, and keeps showing the old value while it does.
  await page.getByRole("button", { name: "Tulis + invalidasi" }).click();
  await expect(widget(page, "cached", "Pesanan")).toContainText("138 pesanan", { timeout: 5000 });
  await expect(widget(page, "plain", "Pesanan")).toContainText("138 pesanan", { timeout: 5000 });

  // 3. And a visit after the invalidation reads instead of painting stale data…
  await leaveAndReturn(page);
  await expect(widget(page, "cached", "Pesanan")).toContainText("138 pesanan");
  await expect(widget(page, "cached", "Pesanan")).toHaveAttribute("data-paint", "cache");
});
