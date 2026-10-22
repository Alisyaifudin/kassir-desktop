import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RecordService, type RecordMode } from ".";

function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 2, 1000, 1, 1);
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at
    ) VALUES ('r1', 10, 10, 0, NULL, 'Kasir', 'incoming', 10000, 'lama', 0, '', '', 10000, 10000, 10, NULL, NULL);
    INSERT INTO product_events (
      product_event_id, product_event_created_at, product_event_value,
      product_event_capital, product_event_note, product_id, stock_id, record_id
    ) VALUES ('e1', 10, -1, 1000, '', 'p1', 's1', 'r1');
    INSERT INTO record_listings (
      record_listing_id, record_listing_group_id, record_id, product_event_id,
      product_id, record_listing_name, record_listing_kind, record_listing_unit,
      record_listing_price, record_listing_qty, record_listing_capital,
      record_listing_total
    ) VALUES ('rl1', 'g1', 'r1', 'e1', 'p1', 'Kopi', 'retail', 1, 10000, 1, 1000, 10000);
    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('rm1', 'r1', 'cash', 10000);
  `);

  return { db, recordLayer };
}

function changeMode(
  recordLayer: Layer.Layer<RecordService>,
  id: string,
  mode: RecordMode,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* record.set.mode(id, mode);
    }).pipe(Effect.provide(recordLayer)),
  );
}

describe("RecordService.set.mode", () => {
  test("soft-deletes the old row, re-points children, and flips the journal", async () => {
    const { db, recordLayer } = setup();
    const newId = await changeMode(recordLayer, "r1", "outcoming");

    expect(newId).not.toBe("r1");
    expect(
      (db.query("SELECT record_deleted_at FROM records WHERE record_id = 'r1'").get() as {
        record_deleted_at: number | null;
      }).record_deleted_at,
    ).not.toBeNull();
    expect(
      (db.query("SELECT record_mode, record_created_at FROM records WHERE record_id = ?").get(newId) as {
        record_mode: string;
        record_created_at: number;
      }),
    ).toEqual({ record_mode: "outcoming", record_created_at: 10 });
    // The copy is the same transaction, so the day it was paid must not be
    // re-stamped with the moment of the flip.
    expect(
      (db.query("SELECT record_paid_at FROM records WHERE record_id = ?").get(newId) as {
        record_paid_at: number | null;
      }).record_paid_at,
    ).toBe(10);
    expect(
      (db.query("SELECT record_id FROM record_listings WHERE record_listing_id = 'rl1'").get() as {
        record_id: string;
      }).record_id,
    ).toBe(newId);
    expect(
      (db.query("SELECT record_id FROM record_methods WHERE record_method_id = 'rm1'").get() as {
        record_id: string;
      }).record_id,
    ).toBe(newId);
    expect(
      (db.query("SELECT product_event_value, record_id FROM product_events WHERE product_event_id = 'e1'").get() as {
        product_event_value: number;
        record_id: string;
      }),
    ).toEqual({ product_event_value: 1, record_id: newId });
    expect(
      (db.query("SELECT stock_value FROM stocks WHERE stock_id = 's1'").get() as {
        stock_value: number;
      }).stock_value,
    ).toBe(4);
  });
});
