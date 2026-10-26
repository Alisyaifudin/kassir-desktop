import type { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { act, render, screen, waitFor } from "@testing-library/react";
import { makeTestDatabase } from "~/services/db/test-support";
import { makeTestLocalStorage } from "~/services/local-storage/test-support";
import { makeTestStore } from "~/services/store/test-support";
import { buildAppLive, makeService } from "~/services/wiring";
import { recalcDiscounts } from "~/lib/purchase";
import { pageCache } from "~/components/page-data";
import type { DraftListing } from "~/services/transaction";
import { offerService } from "./service-proxy";

/**
 * Beranda, integrated: the real service layers over the real migrations, the
 * real page-data provider/gate on top, and nothing between them stubbed.
 *
 * The unit suites cover each service and each page helper on its own; what none of
 * them can show is the chain — a sale committed through `transaction` reaching the
 * day's two summaries, the ledger rows, the debt card and the pocket card, and
 * then *moving* when another write lands. That chain is what the owner reads on
 * opening the app, and every link in it is a place a revision can be dropped.
 *
 * The Tauri backends are the only substitution (`db/store/local-storage`
 * test-support), exactly as the service tests do.
 */
const { db, layer: dbLayer } = makeTestDatabase();
const store = makeTestStore();
const storage = makeTestLocalStorage();

const service = offerService(
  makeService(buildAppLive(Layer.mergeAll(dbLayer, store.layer, storage.layer))),
);

const { daySources } = await import("~/pages/Home/day");
const { pageData } = await import("~/pages/Home/data");
const { currentDayStart } = await import("~/hooks/use-day-start");

/** One product with stock, plus the payment methods the till offers. */
function seed(db: Database) {
  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1), ('qris', 'QRIS', 'qris', 1);
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 100, 1000, 1, 1);
  `);
}

function line(price: number, qty = 1): DraftListing {
  return {
    id: "line-1",
    listingId: "l1",
    name: "Kopi",
    code: "",
    unit: 1,
    price,
    qty,
    discounts: recalcDiscounts(price, qty, []),
  };
}

/** Commit a sale through the transaction service — the path the cart takes. */
async function submitSale(amount: number, options: { credit?: boolean } = {}) {
  await Effect.runPromise(
    Effect.gen(function* () {
      const tx = service.transaction;
      const id = yield* tx.add.new("incoming");
      yield* tx.listings.set(id, [line(amount)]);
      yield* tx.methods.set(id, [
        { id: "m1", methodId: "cash", value: options.credit === true ? 0 : amount },
      ]);
      yield* tx.submit(id, { cashier: "Kasir", credit: options.credit });
    }),
  );
}

const dayStart = currentDayStart();
const sources = () => ({
  ...daySources(dayStart),
  pockets: service.money.pockets.get.changes,
});

/** What the page's own `Gate`s render once their keys are in. */
function HomeProbe() {
  return (
    <pageData.Gate
      keys={["today", "records", "debt", "pockets"]}
      delay={0}
      pulse={<span>memuat</span>}
    >
      {({ today, records, debt, pockets }) => (
        <div>
          <output data-testid="today">{`${today.incoming.count}/${today.incoming.total}`}</output>
          <output data-testid="outcoming">
            {`${today.outcoming.count}/${today.outcoming.total}`}
          </output>
          <output data-testid="records">{String(records.length)}</output>
          <output data-testid="dates">{records.map((record) => record.date).join(",")}</output>
          <output data-testid="debt">{`${debt.count}/${debt.total}`}</output>
          <output data-testid="pockets">
            {pockets
              .map((entry) => `${entry.pocket.name}=${entry.latest?.value ?? "-"}`)
              .join(",")}
          </output>
        </div>
      )}
    </pageData.Gate>
  );
}

function renderHome() {
  return render(
    <pageData.Provider sources={sources()} deps={[dayStart, "admin"]}>
      <HomeProbe />
    </pageData.Provider>,
  );
}

const read = (testId: string) => screen.getByTestId(testId).textContent ?? "";

beforeEach(() => {
  // The page caches answers outside React; each test starts cold but keeps the DB.
  pageCache.clear();
  // Files share the `~/services` module, so point it at this file's service for
  // every test rather than only at module load.
  offerService(service);
  seed(db);
});

describe("Beranda over the real services", () => {
  test("a sale committed through the transaction service reaches the day's figures and the ledger", async () => {
    renderHome();
    await screen.findByTestId("today");
    const before = Number(read("today").split("/")[0]);
    const recordsBefore = Number(read("records"));

    await act(async () => submitSale(20_000));

    await waitFor(() => expect(read("today")).toBe(`${before + 1}/20000`));
    await waitFor(() => expect(read("records")).toBe(String(recordsBefore + 1)));
    // A sale is incoming; the purchase side stays at zero.
    expect(read("outcoming")).toBe("0/0");
  });

  test("a second sale moves the page without a remount — the revision re-reads it", async () => {
    // One write first, so the page has already painted a real answer.
    await act(async () => submitSale(10_000));
    renderHome();
    await waitFor(() => expect(read("today")).not.toBe(""));
    const [beforeCount, beforeTotal] = read("today").split("/").map(Number);

    // No re-render call: the provider must re-run the read itself.
    await act(async () => submitSale(30_000));

    await waitFor(() =>
      expect(read("today")).toBe(`${beforeCount + 1}/${beforeTotal + 30_000}`),
    );
  });

  test("a credit sale opens the debt card with the money still owed", async () => {
    renderHome();
    await screen.findByTestId("debt");
    const before = Number(read("debt").split("/")[0]);

    await act(async () => submitSale(15_000, { credit: true }));

    await waitFor(() => expect(read("debt")).toBe(`${before + 1}/15000`));
  });

  test("a pocket and its entry reach the money card", async () => {
    const pocketId = await Effect.runPromise(
      service.money.pockets.add({ name: "Kas Kecil", type: "absolute" }),
    );

    renderHome();
    await screen.findByTestId("pockets");
    await waitFor(() => expect(read("pockets")).toContain("Kas Kecil=-"));

    // The entry is a write through the money service, not a re-render.
    await act(async () =>
      Effect.runPromise(
        service.money.entries.add.one({
          pocketId,
          timestamp: Date.now(),
          value: 75_000,
          note: "modal",
        }),
      ),
    );

    await waitFor(() => expect(read("pockets")).toContain("Kas Kecil=75000"));
  });

  test("the ledger reads newest first", async () => {
    await act(async () => submitSale(5_000));
    await act(async () => submitSale(7_000));

    renderHome();
    await waitFor(() => expect(read("records")).not.toBe("0"));

    const dates = read("dates").split(",").map(Number);
    expect(dates.length).toBeGreaterThanOrEqual(2);
    // `byRange` answers oldest-first; the page must hand the ledger newest-first.
    for (let i = 1; i < dates.length; i += 1) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});
