import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { Temporal } from "temporal-polyfill";
import { makeTestDatabase } from "../db/test-support";
import { tz } from "~/lib/constants";
import { AnalyticsLive } from "./live";
import { AnalyticsService } from ".";

/**
 * The analytics reads, over a hand-built week. Everything here shares the three
 * rules the service documents: deleted rows out, hand-typed adjustments out, and
 * a record counted on its effective date (paid, else credit, else created).
 */
const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
const at = (daysAgo: number, hour: number) =>
  today.subtract(Temporal.Duration.from({ days: daysAgo })).add({ hours: hour }).epochMilliseconds;

const TODAY = today.toPlainDate().toString();
const FROM = today.subtract(Temporal.Duration.from({ days: 3 })).epochMilliseconds;
const TO = today.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;

function setup() {
  const { db, layer } = makeTestDatabase();
  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1), ('qris', 'QRIS', 'qris', 1);

    -- today, paid sale
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r1', ${at(0, 10)}, ${at(0, 10)}, 0, NULL, 'Ali', 'incoming', 120000, '', 0,
      '', '', 120000, 120000, ${at(0, 10)}, NULL, NULL, 0);

    -- today, paid purchase
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r2', ${at(0, 11)}, ${at(0, 11)}, 0, NULL, 'Ali', 'outcoming', 40000, '', 0,
      '', '', 40000, 40000, ${at(0, 11)}, NULL, NULL, 0);

    -- yesterday, credit sale still open
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r3', ${at(1, 15)}, NULL, 0, ${at(1, 15)}, 'Ali', 'incoming', 0, '', 0,
      '', '', 30000, 30000, ${at(1, 15)}, NULL, NULL, 0);

    -- today, a hand-typed adjustment: never part of a sales figure
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r4', ${at(0, 12)}, ${at(0, 12)}, 0, NULL, 'Ali', 'incoming', 9999, '', 0,
      '', '', 9999, 9999, ${at(0, 12)}, NULL, NULL, 1);

    -- rung up two days ago, settled today: it belongs to today
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r5', ${at(2, 9)}, ${at(0, 13)}, 0, ${at(2, 9)}, 'Ali', 'incoming', 20000, '', 0,
      '', '', 20000, 20000, ${at(0, 13)}, NULL, NULL, 0);

    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1), ('p2', 'Gula', '', 1);

    INSERT INTO record_listings (
      record_listing_id, record_listing_group_id, record_id, product_event_id,
      product_id, record_listing_name, record_listing_kind, record_listing_unit,
      record_listing_price, record_listing_qty, record_listing_capital,
      record_listing_total
    ) VALUES
      ('l1', 'g1', 'r1', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 2, 30000, 100000),
      ('l2', 'g2', 'r1', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
      ('l3', 'g3', 'r5', NULL, 'p1', 'Kopi', 'retail', 1, 20000, 1, 0, 20000);

    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('m1', 'r1', 'cash', 120000), ('m2', 'r2', 'cash', 40000),
             ('m3', 'r5', 'qris', 20000), ('m4', 'r4', 'cash', 9999);
  `);

  return { db, analyticsLayer: AnalyticsLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<AnalyticsService>,
  f: (a: Context.Tag.Service<typeof AnalyticsService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const analytics = yield* AnalyticsService;
      return yield* f(analytics);
    }).pipe(Effect.provide(layer)),
  );
}

describe("AnalyticsService", () => {
  test("daily totals by effective date, split by direction", async () => {
    const { analyticsLayer } = setup();
    const stats = await run(analyticsLayer, (a) => a.get.daily(FROM, TO));

    const incoming = stats.filter((row) => row.mode === "incoming");
    // r1 (120k) and r5 (20k, settled today) land on today; r3 (30k, credit) on
    // yesterday; r4 is an adjustment and is not counted at all.
    expect(incoming.reduce((sum, row) => sum + row.total, 0)).toBe(170000);
    expect(incoming.reduce((sum, row) => sum + row.count, 0)).toBe(3);
    expect(incoming.find((row) => row.day === TODAY)).toMatchObject({
      total: 140000,
      count: 2,
      unpaid: 0,
    });
    expect(incoming.find((row) => row.unpaid > 0)).toMatchObject({
      total: 30000,
      unpaid: 30000,
      creditCount: 1,
    });

    const outgoing = stats.filter((row) => row.mode === "outcoming");
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]).toMatchObject({ total: 40000, count: 1 });
  });

  test("margin comes only from lines that stored a cost", async () => {
    const { analyticsLayer, db } = setup();
    const stats = await run(analyticsLayer, (a) => a.get.margins(FROM, TO));
    console.log(
      "LISTINGS",
      db
        .query(
          "SELECT record_listing_id, record_id, record_listing_capital, record_listing_qty, record_listing_total FROM record_listings",
        )
        .all(),
    );
    console.log("MARGINS", stats);

    const total = stats.reduce((sum, row) => sum + row.margin, 0);
    const costed = stats.reduce((sum, row) => sum + row.costed, 0);
    // l1: 100k − 30k×2 = 40k. l2 and l3 have no cost and contribute nothing.
    expect(total).toBe(40000);
    expect(costed).toBe(1);
  });

  test("hours and weekdays cover the sales, not the adjustments", async () => {
    const { analyticsLayer } = setup();

    const hours = await run(analyticsLayer, (a) => a.get.hours(FROM, TO));
    expect(hours.reduce((sum, row) => sum + row.count, 0)).toBe(3);
    expect(hours.find((row) => row.hour === 10)).toMatchObject({ count: 1, total: 120000 });
    expect(hours.find((row) => row.hour === 15)).toMatchObject({ count: 1, total: 30000 });

    const weekdays = await run(analyticsLayer, (a) => a.get.weekdays(FROM, TO));
    expect(weekdays.reduce((sum, row) => sum + row.count, 0)).toBe(3);
    expect(weekdays.every((row) => row.weekday >= 1 && row.weekday <= 7)).toBe(true);
  });

  test("product groups carry every product and its totals", async () => {
    const { analyticsLayer } = setup();
    const stats = await run(analyticsLayer, (a) => a.get.productGroups(FROM, TO, "incoming"));

    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({
      name: "Kopi",
      productId: "p1",
      qty: 3,
      revenue: 120000,
      margin: 40000,
      costed: 1,
      lines: 2,
    });
    expect(stats[1]).toMatchObject({
      name: "Gula",
      productId: "p2",
      qty: 1,
      revenue: 20000,
      margin: 0,
      costed: 0,
      lines: 1,
    });
  });

  test("product instances carry the record and its effective time", async () => {
    const { analyticsLayer } = setup();
    const rows = await run(analyticsLayer, (a) =>
      a.get.productInstances(FROM, TO, "incoming", "p1", 10),
    );

    expect(rows).toHaveLength(2);
    // Newest first: r5 was settled today, r1 was rung up today too but earlier.
    expect(rows.map((row) => row.recordId)).toEqual(["r5", "r1"]);
    expect(rows[1]).toMatchObject({
      name: "Kopi",
      qty: 2,
      unit: 1,
      price: 50000,
      total: 100000,
      capital: 30000,
      productId: "p1",
    });
    expect(rows[1]!.at).toBe(at(0, 10));
  });

  test("payments group tendered money by method kind", async () => {
    const { analyticsLayer } = setup();
    const stats = await run(analyticsLayer, (a) => a.get.payments(FROM, TO));

    expect(stats).toEqual([
      { kind: "cash", total: 160000, count: 2 },
      { kind: "qris", total: 20000, count: 1 },
    ]);
  });
});
