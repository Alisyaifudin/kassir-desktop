import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
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
      VALUES ('cash', 'Tunai', 'cash', 1);
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at
    ) VALUES ('r1', 10, 10, 0, NULL, 'Kasir', 'incoming', 10000, '', 0, '', '', 10000, 10000, 10, NULL, NULL);
    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('rm1', 'r1', 'cash', 10000);
  `);

  return { db, recordLayer };
}

function run<A>(
  recordLayer: Layer.Layer<RecordService>,
  program: (record: Context.Tag.Service<typeof RecordService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* program(record);
    }).pipe(Effect.provide(recordLayer)),
  );
}

describe("record credit dates", () => {
  test("opens a credit, settles it, and edits the credit date without losing it", async () => {
    const { db, recordLayer } = setup();
    await run(recordLayer, (record) => record.set.toCredit("r1"));

    let row = db.query("SELECT * FROM records WHERE record_id = 'r1'").get() as {
      record_paid_at: number | null;
      record_credit_at: number | null;
      record_pay: number;
    };
    expect(row.record_paid_at).toBeNull();
    expect(row.record_credit_at).not.toBeNull();
    expect(row.record_pay).toBe(0);
    const debts = await run(recordLayer, (record) => record.get.debt());
    expect(debts).toHaveLength(1);
    expect(debts[0].creditAt).toBe(row.record_credit_at!);

    const creditAt = row.record_credit_at!;
    await run(recordLayer, (record) =>
      record.set.payCredit("r1", { pay: 10000, rounding: 0 }),
    );
    row = db.query("SELECT * FROM records WHERE record_id = 'r1'").get() as typeof row;
    expect(row.record_paid_at).not.toBeNull();
    expect(row.record_credit_at).toBe(creditAt);
    expect(row.record_pay).toBe(10000);
    expect(await run(recordLayer, (record) => record.get.debt())).toHaveLength(0);

    await run(recordLayer, (record) => record.set.creditAt("r1", 99));
    row = db.query("SELECT * FROM records WHERE record_id = 'r1'").get() as typeof row;
    expect(row.record_credit_at).toBe(99);
    expect(row.record_paid_at).not.toBeNull();
  });
});
