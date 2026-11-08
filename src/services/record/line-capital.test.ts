import { describe, expect, test } from "bun:test";
import { Effect, Either, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RecordService } from ".";

/**
 * The escape hatch for a wrong `modal`: a purchase booked with the wrong figure
 * hands its cost to every sale that draws from its lot, and those sales then read
 * as losses. Rewriting a line's cost repairs the record — it must not touch the
 * lot, which is a different repair with a different blast radius.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kartu', '', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 0, 2327000, 1, 1);
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at
    ) VALUES ('r1', 10, 10, 0, NULL, 'Kasir', 'incoming', 300000, 'lama', 0, '', '', 300000, 300000, 10, 99, NULL);
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at
    ) VALUES ('r2', 10, 10, 0, NULL, 'Kasir', 'incoming', 100000, '', 0, '', '', 100000, 100000, 10, NULL, NULL);
    INSERT INTO product_events (
      product_event_id, product_event_created_at, product_event_value,
      product_event_capital, product_event_note, product_id, stock_id, record_id
    ) VALUES ('e1', 10, -1, 2327000, '', 'p1', 's1', 'r1'), ('e2', 10, -2, 2327000, '', 'p1', 's1', 'r1');
    -- One line, as the page groups it: a sale of two cards that took one from
    -- each of two lots, so two rows share one group id.
    INSERT INTO record_listings (
      record_listing_id, record_listing_group_id, record_id, product_event_id,
      product_id, record_listing_name, record_listing_kind, record_listing_unit,
      record_listing_price, record_listing_qty, record_listing_capital,
      record_listing_total
    ) VALUES
      ('rl1', 'g1', 'r1', 'e1', 'p1', 'Kartu', 'retail', 1, 100000, 1, 2327000, 100000),
      ('rl2', 'g1', 'r1', 'e2', 'p1', 'Kartu', 'retail', 1, 100000, 1, 2000000, 100000),
      ('rl3', 'g2', 'r2', NULL, NULL, 'Kartu', 'retail', 1, 100000, 1, 2327000, 100000);
  `);

  return { db, recordLayer };
}

function fix(
  recordLayer: Layer.Layer<RecordService>,
  id: string,
  listingId: string,
  input: { capital: number; reason: string; by: string },
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* record.set.lineCapital(id, listingId, input);
    }).pipe(Effect.either, Effect.provide(recordLayer)),
  );
}

type Row = {
  record_listing_capital: number;
  record_note?: string;
  record_updated_at?: number;
  record_sync_at?: number | null;
};

const capitals = (db: ReturnType<typeof setup>["db"], group: string) =>
  db
    .query(
      "SELECT record_listing_capital FROM record_listings WHERE record_listing_group_id = ? ORDER BY record_listing_id",
    )
    .all(group) as Row[];

const header = (db: ReturnType<typeof setup>["db"], id: string) =>
  db
    .query("SELECT record_note, record_updated_at, record_sync_at FROM records WHERE record_id = ?")
    .get(id) as Row;

describe("RecordService.set.lineCapital", () => {
  test("rewrites every portion of the line and records who changed it, and why", async () => {
    const { db, recordLayer } = setup();
    const result = await fix(recordLayer, "r1", "g1", {
      capital: 58_950,
      reason: "salah input waktu beli",
      by: "Ali",
    });

    expect(Either.isRight(result)).toBe(true);
    // The figure is a cost per unit, so the line's two lots both take it and the
    // page reads exactly what was typed.
    expect(capitals(db, "g1").map((row) => row.record_listing_capital)).toEqual([58_950, 58_950]);

    // The lot is untouched: the stock journal is a different repair, and this
    // write is scoped to the record it was made on.
    expect(
      (
        db
          .query("SELECT product_event_capital FROM product_events WHERE product_event_id = 'e1'")
          .get() as {
          product_event_capital: number;
        }
      ).product_event_capital,
    ).toBe(2_327_000);
    expect(
      (
        db.query("SELECT stock_capital FROM stocks WHERE stock_id = 's1'").get() as {
          stock_capital: number;
        }
      ).stock_capital,
    ).toBe(2_327_000);

    // The note restates the line's own qty-weighted average, not one portion's
    // figure: 2.327.000 and 2.000.000 over one unit each.
    const after = header(db, "r1");
    expect(after.record_note).toBe(
      "lama\nPerbaikan modal Kartu: 2.163.500 → 58.950 — salah input waktu beli (Ali)",
    );
    // A changed record must be re-pushed: the header moves and the sync stamp is
    // cleared, exactly as the date corrections do.
    expect(after.record_updated_at).toBeGreaterThan(10);
    expect(after.record_sync_at).toBeNull();
  });

  test("starts the note when the record had none", async () => {
    const { db, recordLayer } = setup();
    await fix(recordLayer, "r2", "g2", { capital: 58_950, reason: "salah input", by: "Ali" });
    expect(header(db, "r2").record_note).toBe(
      "Perbaikan modal Kartu: 2.327.000 → 58.950 — salah input (Ali)",
    );
  });

  test("refuses a blank reason — the note is the only trace of the write", async () => {
    const { db, recordLayer } = setup();
    const result = await fix(recordLayer, "r1", "g1", { capital: 1, reason: "   ", by: "Ali" });

    expect(Either.isLeft(result)).toBe(true);
    expect(capitals(db, "g1").map((row) => row.record_listing_capital)).toEqual([
      2_327_000, 2_000_000,
    ]);
    expect(header(db, "r1").record_note).toBe("lama");
  });

  test("refuses a negative or non-finite cost", async () => {
    const { recordLayer } = setup();
    for (const capital of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = await fix(recordLayer, "r1", "g1", { capital, reason: "x", by: "Ali" });
      expect(Either.isLeft(result)).toBe(true);
    }
  });

  test("refuses a line that belongs to another record", async () => {
    const { db, recordLayer } = setup();
    const result = await fix(recordLayer, "r1", "g2", { capital: 1, reason: "x", by: "Ali" });

    expect(Either.isLeft(result)).toBe(true);
    expect(capitals(db, "g2")[0]?.record_listing_capital).toBe(2_327_000);
    expect(header(db, "r1").record_note).toBe("lama");
  });

  test("restating the same cost writes nothing at all", async () => {
    const { db, recordLayer } = setup();
    const result = await fix(recordLayer, "r2", "g2", {
      capital: 2_327_000,
      reason: "sudah benar",
      by: "Ali",
    });

    expect(Either.isRight(result)).toBe(true);
    // No revision bump, no note line: a save that changed nothing should not
    // re-read the page or claim a correction happened.
    expect(header(db, "r2").record_note).toBe("");
    expect(header(db, "r2").record_updated_at).toBe(10);
    expect(header(db, "r2").record_sync_at).toBeNull();
  });
});
