import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { recalcDiscounts } from "~/lib/purchase";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { TransactionLive } from "../transaction/live";
import { TransactionService } from "../transaction";
import { RecordLive } from "./live";
import { RecordService } from ".";

/**
 * Goods sold before they were booked, then bought: the purchase has to close the
 * hole in the inventory before it can price the stock it leaves behind.
 *
 * The sale and the purchase go through the till's own commit path over the real
 * migrations, because the point is what the two records leave in `stocks` — and
 * what deleting the purchase has to put back.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));
  const transactionLayer = TransactionLive.pipe(
    Layer.provide(layer),
    Layer.provide(recordLayer),
  );

  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 2, 1000, 1, 1), ('s2', 'p1', 5, 2000, 2, 2);
  `);

  return { db, transactionLayer, recordLayer };
}

type Layers = ReturnType<typeof setup>;

let seq = 0;

/** One record line at `price` per pc, no discounts. */
function line(price: number, qty: number) {
  seq += 1;
  return {
    id: `line-${seq}`,
    listingId: "l1",
    name: "Kopi",
    code: "",
    unit: 1,
    price,
    qty,
    discounts: recalcDiscounts(price, qty, []),
  };
}

/** Ring up one line and commit it, tendering exactly its total. */
function commit(
  layers: Layers,
  input: { mode: "incoming" | "outcoming"; price: number; qty: number },
): Promise<string> {
  const total = input.price * input.qty;
  return Effect.runPromise(
    Effect.gen(function* () {
      const tx = yield* TransactionService;
      const id = yield* tx.add.new(input.mode);
      yield* tx.listings.set(id, [line(input.price, input.qty)]);
      yield* tx.methods.set(id, [{ id: "m1", methodId: "cash", value: total }]);
      yield* tx.set.fix(id, 0);
      yield* tx.set.rounding(id, 0);
      const recordId = yield* tx.submit(id, { cashier: "Kasir" });
      // A submitted draft is gone already; this only cancels the setters' debounce.
      yield* tx.delete.byId(id);
      return recordId;
    }).pipe(Effect.provide(layers.transactionLayer)),
  );
}

function deleteRecord(layers: Layers, id: string) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      yield* record.delete.byId(id);
    }).pipe(Effect.provide(layers.recordLayer)),
  );
}

type LotRow = { stock_id: string; stock_value: number; stock_capital: number };

function lots(db: Layers["db"]): LotRow[] {
  return db
    .query(
      `SELECT stock_id, stock_value, stock_capital FROM stocks
       WHERE product_id = 'p1' ORDER BY stock_created_at, stock_id`,
    )
    .all() as LotRow[];
}

describe("a purchase that arrives on oversold stock", () => {
  test("closes the hole, then prices the rest at the price just paid", async () => {
    const layers = setup();

    // 10 pcs out of a stock of 7: the newest lot absorbs the shortage.
    await commit(layers, { mode: "incoming", price: 10000, qty: 10 });
    expect(lots(layers.db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: -3, stock_capital: 2000 },
    ]);

    // 12 pcs bought at 3.000: 3 close the hole, the other 9 stay at 3.000.
    await commit(layers, { mode: "outcoming", price: 3000, qty: 12 });

    const after = lots(layers.db);
    expect(after).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 9, stock_capital: 3000 },
    ]);
    // 9 pcs that cost 3.000 each — not the hole's -6.000 smeared over them.
    expect(after.reduce((value, lot) => value + lot.stock_value * lot.stock_capital, 0)).toBe(
      27000,
    );
  });

  test("records the purchase at its own price, so the record still ties", async () => {
    const layers = setup();
    await commit(layers, { mode: "incoming", price: 10000, qty: 10 });
    const purchaseId = await commit(layers, { mode: "outcoming", price: 3000, qty: 12 });

    const portion = layers.db
      .query(
        `SELECT record_listing_qty, record_listing_capital, record_listing_total
         FROM record_listings WHERE record_id = $1`,
      )
      .get(purchaseId) as {
      record_listing_qty: number;
      record_listing_capital: number;
      record_listing_total: number;
    };
    expect(portion.record_listing_qty).toBe(12);
    expect(portion.record_listing_capital).toBe(3000);
    expect(portion.record_listing_total).toBe(36000);
  });

  test("puts the oversold lot back when the purchase is deleted", async () => {
    const layers = setup();
    await commit(layers, { mode: "incoming", price: 10000, qty: 10 });
    const purchaseId = await commit(layers, { mode: "outcoming", price: 3000, qty: 12 });

    await deleteRecord(layers, purchaseId);

    // The fill, the reprice and the receipt are all journalled against the
    // record, so undoing it leaves the lot owing exactly what it owed before.
    expect(lots(layers.db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: -3, stock_capital: 2000 },
    ]);
  });
});
