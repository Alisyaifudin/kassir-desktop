import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RecordService } from ".";

function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1), ('qris', 'QRIS', 'qris', 1);
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at
    ) VALUES ('r1', 10, 10, 0, NULL, 'Kasir', 'incoming', 10000, '', 0, '', '', 10000, 10000, 10, 5, NULL);
    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('rm1', 'r1', 'cash', 10000);
  `);

  return { db, recordLayer };
}

function changeMethod(
  recordLayer: Layer.Layer<RecordService>,
  id: string,
  methodId: string,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* record.set.method(id, methodId);
    }).pipe(Effect.provide(recordLayer), Effect.either),
  );
}

describe("RecordService.set.method", () => {
  test("re-points the payment and leaves the money alone", async () => {
    const { db, recordLayer } = setup();
    const result = await changeMethod(recordLayer, "r1", "qris");
    expect(result._tag).toBe("Right");

    expect(
      db.query("SELECT method_id, record_method_pay FROM record_methods WHERE record_id = 'r1'").all(),
    ).toEqual([{ method_id: "qris", record_method_pay: 10000 }]);
    // A wrong method label is a filing mistake, not a restatement of the sale.
    expect(
      (db.query("SELECT record_pay FROM records WHERE record_id = 'r1'").get() as {
        record_pay: number;
      }).record_pay,
    ).toBe(10000);

    const row = db
      .query("SELECT record_updated_at, record_sync_at FROM records WHERE record_id = 'r1'")
      .get() as { record_updated_at: number; record_sync_at: number | null };
    expect(row.record_sync_at).toBeNull();
    expect(row.record_updated_at).toBeGreaterThan(10);
  });

  test("fails on an unknown method and writes nothing", async () => {
    const { db, recordLayer } = setup();
    const result = await changeMethod(recordLayer, "r1", "giro");

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && result.left.message).toBe("Metode tidak ditemukan");
    expect(
      (db.query("SELECT method_id FROM record_methods WHERE record_id = 'r1'").get() as {
        method_id: string;
      }).method_id,
    ).toBe("cash");
    expect(
      (db.query("SELECT record_sync_at FROM records WHERE record_id = 'r1'").get() as {
        record_sync_at: number | null;
      }).record_sync_at,
    ).toBe(5);
  });

  test("fails on a missing record", async () => {
    const { recordLayer } = setup();
    const result = await changeMethod(recordLayer, "nope", "qris");

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && result.left.message).toBe("Catatan tidak ditemukan");
  });
});
