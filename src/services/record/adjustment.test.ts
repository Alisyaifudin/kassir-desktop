import { describe, expect, test } from "bun:test";
import { Effect, Layer, Either } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RECORD_FLAG_ADJUSTMENT, RecordService, type RecordAdjustmentInput } from ".";

/**
 * The `/transaction` writer: extras only, one payment, and a flag that says this
 * record was typed by hand rather than rung up from goods.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
  `);

  return { db, recordLayer };
}

function add(recordLayer: Layer.Layer<RecordService>, input: RecordAdjustmentInput) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* record.add.adjustment(input);
    }).pipe(Effect.provide(recordLayer)),
  );
}

const INPUT: RecordAdjustmentInput = {
  mode: "outcoming",
  cashier: "Ali",
  note: "koreksi kas",
  methodId: "cash",
  extras: [
    { name: "Ongkos kirim", value: 5000 },
    { name: "Diskon langganan", value: -1000 },
  ],
};

describe("RecordService.add.adjustment", () => {
  test("writes a flagged, extras-only record with one payment", async () => {
    const { db, recordLayer } = setup();
    const id = await add(recordLayer, INPUT);

    const header = db
      .query(
        `SELECT record_flag, record_mode, record_sub_total, record_total, record_pay,
                record_rounding, record_fix, record_note, record_cashier,
                record_paid_at IS NULL AS unpaid, record_credit_at IS NULL AS no_credit,
                record_customer_name, record_supplier_id
           FROM records WHERE record_id = ?`,
      )
      .get(id);

    expect(header).toEqual({
      record_flag: RECORD_FLAG_ADJUSTMENT,
      record_mode: "outcoming",
      record_sub_total: 4000,
      record_total: 4000,
      record_pay: 4000,
      record_rounding: 0,
      record_fix: 0,
      record_note: "koreksi kas",
      record_cashier: "Ali",
      unpaid: 0, // paid at once: paid_at is set
      no_credit: 1, // and it is not a credit
      record_customer_name: "",
      record_supplier_id: null,
    });

    expect(
      db
        .query(
          `SELECT record_extra_name, record_extra_value, record_extra_eff, record_extra_kind
             FROM record_extras WHERE record_id = ? ORDER BY record_extra_name`,
        )
        .all(id),
    ).toEqual([
      {
        record_extra_name: "Diskon langganan",
        record_extra_value: -1000,
        record_extra_eff: -1000,
        record_extra_kind: "number",
      },
      {
        record_extra_name: "Ongkos kirim",
        record_extra_value: 5000,
        record_extra_eff: 5000,
        record_extra_kind: "number",
      },
    ]);

    // One method pays the whole total, and nothing was sold.
    expect(
      db
        .query("SELECT method_id, record_method_pay FROM record_methods WHERE record_id = ?")
        .all(id),
    ).toEqual([{ method_id: "cash", record_method_pay: 4000 }]);
    expect(
      (
        db.query("SELECT COUNT(*) AS c FROM record_listings WHERE record_id = ?").get(id) as {
          c: number;
        }
      ).c,
    ).toBe(0);
    // No listing means no stock journal entry and no stock change.
    expect((db.query("SELECT COUNT(*) AS c FROM product_events").get() as { c: number }).c).toBe(0);
  });

  test("is readable as a record with no lines", async () => {
    const { recordLayer } = setup();
    const id = await add(recordLayer, INPUT);

    const full = await Effect.runPromise(
      Effect.gen(function* () {
        const record = yield* RecordService;
        return yield* record.get.byId(id);
      }).pipe(Effect.provide(recordLayer)),
    );

    expect(full.listings).toEqual([]);
    expect(full.extras.map((extra) => extra.name).sort()).toEqual([
      "Diskon langganan",
      "Ongkos kirim",
    ]);
  });

  test("refuses a record with no named lines", async () => {
    const { recordLayer } = setup();
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const record = yield* RecordService;
        return yield* record.add.adjustment({ ...INPUT, extras: [{ name: "   ", value: 500 }] });
      }).pipe(Effect.provide(recordLayer), Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe("Transaksi harus punya minimal satu baris");
    }
  });

  test("refuses a total that is zero or negative", async () => {
    const { recordLayer } = setup();
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const record = yield* RecordService;
        return yield* record.add.adjustment({
          ...INPUT,
          extras: [
            { name: "Masuk", value: 1000 },
            { name: "Keluar", value: -1000 },
          ],
        });
      }).pipe(Effect.provide(recordLayer), Effect.either),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe("Total transaksi tidak boleh nol atau negatif");
    }
  });
});
