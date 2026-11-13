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
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 2, 1000, 1, 1);
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_supplier_id,
      record_supplier_name, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r1', 10, 10, 0, NULL, 'Kasir', 'incoming', 10000, 'lama', 0, '', '',
      'sup1', 'Toko Sumber', 10000, 10000, 10, 99, NULL, 0);
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
    INSERT INTO discounts (
      discount_id, discount_group_id, record_listing_id, discount_kind,
      discount_value, discount_eff
    ) VALUES ('d1', 'dg1', 'rl1', 'number', 500, 500);
    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('rm1', 'r1', 'cash', 10000);
    INSERT INTO record_extras (
      record_extra_id, record_extra_name, record_id, record_extra_value,
      record_extra_eff, record_extra_kind, record_extra_flag
    ) VALUES ('re1', 'Ongkir', 'r1', 0, 0, 'number', 0);
    INSERT INTO record_images (
      record_image_id, record_image_order, record_image_name, record_image_mime, record_id
    ) VALUES ('ri1', 0, 'nota.png', 'image/png', 'r1');
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

function count(db: ReturnType<typeof setup>["db"], sql: string, ...params: string[]) {
  return (db.query(sql).get(...params) as { n: number }).n;
}

describe("RecordService.set.mode", () => {
  test("soft-deletes the old row, copies its children, and flips the journal", async () => {
    const { db, recordLayer } = setup();
    const newId = await changeMode(recordLayer, "r1", "outcoming");

    expect(newId).not.toBe("r1");
    expect(
      (db.query("SELECT record_deleted_at FROM records WHERE record_id = 'r1'").get() as {
        record_deleted_at: number | null;
      }).record_deleted_at,
    ).not.toBeNull();
    expect(
      (db.query("SELECT record_mode FROM records WHERE record_id = ?").get(newId) as {
        record_mode: string;
      }).record_mode,
    ).toBe("outcoming");

    // The copy is the same transaction, so the day it was created and paid must
    // not be re-stamped with the moment of the flip — and nothing else about the
    // money may drift either.
    const copied = db
      .query(
        `SELECT record_created_at, record_paid_at, record_total, record_pay,
                record_note, record_supplier_id, record_supplier_name, record_flag
           FROM records WHERE record_id = ?`,
      )
      .get(newId) as Record<string, unknown>;
    expect(copied).toEqual({
      record_created_at: 10,
      record_paid_at: 10,
      record_total: 10000,
      record_pay: 10000,
      record_note: "lama",
      record_supplier_id: "sup1",
      record_supplier_name: "Toko Sumber",
      record_flag: 0,
    });
    // A flip is a correction of the tombstone, not a `dual` twin: voiding one
    // must never void the other.
    expect(
      (db.query("SELECT record_pair_id FROM records WHERE record_id = ?").get(newId) as {
        record_pair_id: string | null;
      }).record_pair_id,
    ).toBeNull();
  });

  test("the tombstone keeps its children; the copy gets keys of its own", async () => {
    const { db, recordLayer } = setup();
    const newId = await changeMode(recordLayer, "r1", "outcoming");

    // A child primary key may belong to exactly one record (SYNC-V2 §10.3). Moving
    // the rows to the new record would hand the server a key it already has — the
    // frame is refused as `bad_frame`, and the whole record group stops moving.
    expect(
      (db.query("SELECT record_id FROM record_listings WHERE record_listing_id = 'rl1'").get() as {
        record_id: string;
      }).record_id,
    ).toBe("r1");
    const listing = db
      .query(
        `SELECT record_listing_id, record_listing_group_id, record_listing_qty,
                record_listing_capital, record_listing_total, product_event_id
           FROM record_listings WHERE record_id = ?`,
      )
      .all(newId) as Record<string, unknown>[];
    expect(listing).toHaveLength(1);
    expect(listing[0]).toMatchObject({
      record_listing_group_id: "g1",
      record_listing_qty: 1,
      record_listing_capital: 1000,
      record_listing_total: 10000,
    });
    expect(listing[0]!["record_listing_id"]).not.toBe("rl1");
    expect(listing[0]!["product_event_id"]).not.toBe("e1");

    for (const [table, column] of [
      ["record_methods", "record_method_id"],
      ["record_extras", "record_extra_id"],
      ["record_images", "record_image_id"],
    ] as const) {
      const rows = db
        .query(`SELECT ${column} AS id FROM ${table} WHERE record_id = ?`)
        .all(newId) as { id: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).not.toBe(
        { record_methods: "rm1", record_extras: "re1", record_images: "ri1" }[table],
      );
      expect(count(db, `SELECT count(*) AS n FROM ${table} WHERE record_id = 'r1'`)).toBe(1);
    }

    // The discount follows the listing it was entered on, and keeps its group so
    // the read model still shows one discount for the line.
    const discounts = db
      .query(
        `SELECT d.discount_id, d.discount_group_id, d.record_listing_id, d.discount_eff
           FROM discounts d JOIN record_listings rl ON rl.record_listing_id = d.record_listing_id
          WHERE rl.record_id = ?`,
      )
      .all(newId) as Record<string, unknown>[];
    expect(discounts).toHaveLength(1);
    expect(discounts[0]).toMatchObject({ discount_group_id: "dg1", discount_eff: 500 });
    expect(discounts[0]!["discount_id"]).not.toBe("d1");
    expect(discounts[0]!["record_listing_id"]).toBe(listing[0]!["record_listing_id"]);
  });

  test("the journal is appended to, never rewritten: stock reverses and re-books", async () => {
    const { db, recordLayer } = setup();
    const newId = await changeMode(recordLayer, "r1", "outcoming");

    // `product_events` is append-only on the wire: an event edited in place is a
    // `noop` on the server, so the flip would never reach another till. The old
    // event keeps its value and its owner; the reversal is a new row.
    expect(
      db
        .query(
          `SELECT product_event_value, record_id FROM product_events
            WHERE product_event_id = 'e1'`,
        )
        .get(),
    ).toEqual({ product_event_value: -1, record_id: "r1" });

    const events = db
      .query(
        `SELECT product_event_value, record_id, stock_id FROM product_events
          WHERE product_event_id <> 'e1'`,
      )
      .all() as { product_event_value: number; record_id: string | null; stock_id: string }[];
    // One compensation for the sale, one receipt for the purchase. They share a
    // timestamp, so the order between them is the id's, not the write's.
    expect(events.map((event) => event.product_event_value)).toEqual([1, 1]);
    expect(events.filter((event) => event.record_id === null)).toHaveLength(1);
    expect(events.filter((event) => event.record_id === newId)).toHaveLength(1);
    expect(events.every((event) => event.stock_id === "s1")).toBe(true);

    // The cached lot is the journal's own sum plus its opening balance (2 pcs
    // were sitting in `stocks` before the sale was journaled).
    expect(
      (db.query("SELECT stock_value FROM stocks WHERE stock_id = 's1'").get() as {
        stock_value: number;
      }).stock_value,
    ).toBe(4);
  });

  test("flipping back to the original mode keeps the aggregate legal", async () => {
    const { db, recordLayer } = setup();
    const outcoming = await changeMode(recordLayer, "r1", "outcoming");
    const incoming = await changeMode(recordLayer, outcoming, "incoming");

    const live = db
      .query("SELECT record_id FROM records WHERE record_deleted_at IS NULL")
      .all() as { record_id: string }[];
    expect(live.map((row) => row.record_id)).toEqual([incoming]);

    // Every child key in the table belongs to exactly one record, which is the
    // rule the server applies to a push.
    for (const table of [
      "record_listings",
      "record_methods",
      "record_extras",
      "record_images",
    ]) {
      expect(
        count(
          db,
          `SELECT count(*) AS n FROM (
             SELECT ${table === "record_listings" ? "record_listing_id" : `${table.slice(0, -1)}_id`} AS id
               FROM ${table} GROUP BY id HAVING count(DISTINCT record_id) > 1)`,
        ),
      ).toBe(0);
    }

    // Back where it started: reversing the purchase re-applies the sale, so the
    // round trip leaves the opening two pcs alone.
    expect(
      (db.query("SELECT stock_value FROM stocks WHERE stock_id = 's1'").get() as {
        stock_value: number;
      }).stock_value,
    ).toBe(2);
  });
});
