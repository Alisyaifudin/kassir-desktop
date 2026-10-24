import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RecordService } from ".";

/**
 * `set.payment` is the only write that restates how a record was settled, so the
 * pairing it must keep is what needs pinning: the `record_methods` rows and the
 * `record_pay` cache have to say the same thing afterwards, and the record's
 * totals must not move with them.
 */

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
    ) VALUES
      ('r1', 10, 10, 0, NULL, 'Kasir', 'incoming', 10000, '', 0, '', '', 10000, 10000, 10, 5, NULL),
      ('credit', 10, NULL, 0, 10, 'Kasir', 'incoming', 0, '', 0, '', '', 10000, 10000, 10, 5, NULL);
    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('rm1', 'r1', 'cash', 10000), ('rm2', 'credit', 'cash', 0);
  `);

  return { db, recordLayer };
}

function setPayment(
  recordLayer: Layer.Layer<RecordService>,
  id: string,
  payments: { methodId: string; pay: number }[],
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* record.set.payment(id, payments);
    }).pipe(Effect.provide(recordLayer), Effect.either),
  );
}

function methodsOf(db: ReturnType<typeof setup>["db"], id: string) {
  return db
    .query(
      "SELECT method_id, record_method_pay FROM record_methods WHERE record_id = ? ORDER BY rowid",
    )
    .all(id);
}

function headerOf(db: ReturnType<typeof setup>["db"], id: string) {
  return db
    .query(
      `SELECT record_pay, record_total, record_rounding, record_updated_at, record_sync_at
       FROM records WHERE record_id = ?`,
    )
    .get(id) as {
    record_pay: number;
    record_total: number;
    record_rounding: number;
    record_updated_at: number;
    record_sync_at: number | null;
  };
}

describe("RecordService.set.payment", () => {
  test("restates the amount and the cache together", async () => {
    const { db, recordLayer } = setup();
    const result = await setPayment(recordLayer, "r1", [{ methodId: "cash", pay: 12000 }]);

    expect(result._tag).toBe("Right");
    expect(methodsOf(db, "r1")).toEqual([{ method_id: "cash", record_method_pay: 12000 }]);
    // The cache is the sum of the rows, so the detail pane's change follows the
    // new tender without the total moving.
    const header = headerOf(db, "r1");
    expect(header.record_pay).toBe(12000);
    expect(header.record_total).toBe(10000);
    expect(header.record_sync_at).toBeNull();
    expect(header.record_updated_at).toBeGreaterThan(10);
  });

  test("files a single payment under another method", async () => {
    const { db, recordLayer } = setup();
    const result = await setPayment(recordLayer, "r1", [{ methodId: "qris", pay: 10000 }]);

    expect(result._tag).toBe("Right");
    expect(methodsOf(db, "r1")).toEqual([{ method_id: "qris", record_method_pay: 10000 }]);
    expect(headerOf(db, "r1").record_pay).toBe(10000);
  });

  test("splits one tender across two methods, and collapses it back", async () => {
    const { db, recordLayer } = setup();
    const split = await setPayment(recordLayer, "r1", [
      { methodId: "cash", pay: 6000 },
      { methodId: "qris", pay: 5000 },
    ]);

    expect(split._tag).toBe("Right");
    expect(methodsOf(db, "r1")).toEqual([
      { method_id: "cash", record_method_pay: 6000 },
      { method_id: "qris", record_method_pay: 5000 },
    ]);
    expect(headerOf(db, "r1").record_pay).toBe(11000);

    const merged = await setPayment(recordLayer, "r1", [{ methodId: "qris", pay: 10000 }]);
    expect(merged._tag).toBe("Right");
    // The replaced list is what is stored: the removed row has no leftover.
    expect(methodsOf(db, "r1")).toEqual([{ method_id: "qris", record_method_pay: 10000 }]);
    expect(headerOf(db, "r1").record_pay).toBe(10000);
  });

  test("refuses a tender that does not cover the total", async () => {
    const { db, recordLayer } = setup();
    const result = await setPayment(recordLayer, "r1", [{ methodId: "cash", pay: 5000 }]);

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && result.left.message).toBe(
      "Pembayaran tidak cukup, minimal 10.000",
    );
    expect(methodsOf(db, "r1")).toEqual([{ method_id: "cash", record_method_pay: 10000 }]);
    expect(headerOf(db, "r1").record_sync_at).toBe(5);
  });

  test("refuses an unknown method and writes nothing", async () => {
    const { db, recordLayer } = setup();
    const result = await setPayment(recordLayer, "r1", [
      { methodId: "cash", pay: 5000 },
      { methodId: "giro", pay: 5000 },
    ]);

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && result.left.message).toBe("Metode tidak ditemukan");
    expect(methodsOf(db, "r1")).toEqual([{ method_id: "cash", record_method_pay: 10000 }]);
    expect(headerOf(db, "r1").record_sync_at).toBe(5);
  });

  test("refuses a negative amount and an empty list", async () => {
    const { recordLayer } = setup();
    const negative = await setPayment(recordLayer, "r1", [{ methodId: "cash", pay: -1000 }]);
    const empty = await setPayment(recordLayer, "r1", []);

    expect(negative._tag === "Left" && negative.left.message).toBe(
      "Jumlah pembayaran tidak valid",
    );
    expect(empty._tag === "Left" && empty.left.message).toBe("Minimal satu pembayaran");
  });

  test("refuses an outstanding credit, whose money is not tendered yet", async () => {
    const { db, recordLayer } = setup();
    const result = await setPayment(recordLayer, "credit", [{ methodId: "cash", pay: 10000 }]);

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && result.left.message).toBe(
      "Kredit yang belum dibayar tidak punya pembayaran",
    );
    expect(methodsOf(db, "credit")).toEqual([{ method_id: "cash", record_method_pay: 0 }]);
    expect(headerOf(db, "credit").record_sync_at).toBe(5);
  });

  test("fails on a missing record", async () => {
    const { recordLayer } = setup();
    const result = await setPayment(recordLayer, "nope", [{ methodId: "cash", pay: 10000 }]);

    expect(result._tag).toBe("Left");
    expect(result._tag === "Left" && result.left.message).toBe("Catatan tidak ditemukan");
  });
});
