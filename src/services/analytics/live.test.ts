import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { Temporal } from "temporal-polyfill";
import { makeTestDatabase } from "../db/test-support";
import { tz } from "~/lib/constants";
import { AnalyticsLive } from "./live";
import { AnalyticsService, pairLift } from ".";

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

  test("margin believes a stored cost only when it is one, and estimates the rest", async () => {
    const { analyticsLayer, db } = setup();
    // l4 is the shape the v1 migration left behind: its "cost" is exactly the
    // price it sold for, which is not a cost at all. Reading it as one is what
    // made a normal week's chart read zero.
    db.exec(`
      INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES ('l4', 'g4', 'r1', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 20000, 20000);
    `);

    const stats = await run(analyticsLayer, (a) =>
      a.get.margins(FROM, TO, { percent: 10, raw: 5000 }),
    );
    const sum = (pick: (row: (typeof stats)[number]) => number) =>
      stats.reduce((total, row) => total + pick(row), 0);

    // l1: 100k − 30k×2 = 40k. l2, l3 and l4 have no believable cost: 10% of 20k
    // each, under the 5k cap.
    expect(sum((row) => row.margin)).toBe(40000);
    expect(sum((row) => row.costed)).toBe(1);
    expect(sum((row) => row.estimatedMargin)).toBe(6000);
    expect(sum((row) => row.estimated)).toBe(3);
  });

  test("the estimate is capped per line, not per day", async () => {
    const { analyticsLayer, db } = setup();
    db.exec(`
      INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES
        ('l4', 'g4', 'r1', NULL, 'p1', 'Kopi', 'retail', 1, 200000, 1, 0, 200000),
        ('l5', 'g5', 'r1', NULL, 'p1', 'Kopi', 'retail', 1, 60000, 1, 0, 60000);
    `);

    const stats = await run(analyticsLayer, (a) =>
      a.get.margins(FROM, TO, { percent: 10, raw: 5000 }),
    );
    const estimatedMargin = stats.reduce((sum, row) => sum + row.estimatedMargin, 0);

    // 200k × 10% is 20k and 60k × 10% is 6k; both are cut to 5k, and the two
    // lines with no cost in the seed add 2k each. One 5k ceiling for the whole
    // day would have been 5k in total, not 10k from the two big lines.
    expect(estimatedMargin).toBe(5000 + 5000 + 2000 + 2000);
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

  test("a pair that met once is not an edge", async () => {
    const { analyticsLayer } = setup();
    const { records, pairs } = await run(analyticsLayer, (a) =>
      a.get.productPairs(FROM, TO, "incoming"),
    );

    // The seed's only shared basket is r1 (Kopi + Gula). One observation is a
    // coincidence, so there is no network — but the period still knows it looked
    // at two records (r1 and r5), which is a different sentence on the page than
    // "nothing sold".
    expect(pairs).toEqual([]);
    expect(records).toBe(2);
  });

  test("pairs count records, and only the records a sale is", async () => {
    const { analyticsLayer, db } = setup();
    // Every way a count can go wrong, in one fixture. Against the seed's r1
    // (Kopi + Gula, incoming):
    //   r6  Kopi entered as two lot portions + Gula + Teh
    //   r7  Kopi + Gula
    //   r8  Gula + Teh
    //   r9  a purchase of the same three products
    //   r10 deleted after the fact
    //   r11 a hand-typed adjustment (flag bit 0)
    //   r12 Kopi plus a manual line with no product to link
    db.exec(`
      INSERT INTO products (product_id, product_name, product_note, product_updated_at)
        VALUES ('p3', 'Teh', '', 1);

      INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag
      ) VALUES
        ('r6',  ${at(0, 14)}, ${at(0, 14)}, 0, NULL, 'Ali', 'incoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 14)}, NULL, NULL, 0),
        ('r7',  ${at(0, 15)}, ${at(0, 15)}, 0, NULL, 'Ali', 'incoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 15)}, NULL, NULL, 0),
        ('r8',  ${at(0, 16)}, ${at(0, 16)}, 0, NULL, 'Ali', 'incoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 16)}, NULL, NULL, 0),
        ('r9',  ${at(0, 17)}, ${at(0, 17)}, 0, NULL, 'Ali', 'outcoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 17)}, NULL, NULL, 0),
        ('r10', ${at(0, 18)}, ${at(0, 18)}, 0, NULL, 'Ali', 'incoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 18)}, NULL, ${at(0, 19)}, 0),
        ('r11', ${at(0, 20)}, ${at(0, 20)}, 0, NULL, 'Ali', 'incoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 20)}, NULL, NULL, 1),
        ('r12', ${at(0, 21)}, ${at(0, 21)}, 0, NULL, 'Ali', 'incoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 21)}, NULL, NULL, 0);

      INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES
        -- one line, two lots: two rows, one product in the basket
        ('l10', 'g10', 'r6', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l11', 'g11', 'r6', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 30000, 50000),
        ('l12', 'g12', 'r6', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l13', 'g13', 'r6', NULL, 'p3', 'Teh', 'retail', 1, 10000, 1, 0, 10000),
        ('l14', 'g14', 'r7', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l15', 'g15', 'r7', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l16', 'g16', 'r8', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l17', 'g17', 'r8', NULL, 'p3', 'Teh', 'retail', 1, 10000, 1, 0, 10000),
        ('l18', 'g18', 'r9', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l19', 'g19', 'r9', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l20', 'g20', 'r10', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l21', 'g21', 'r10', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l22', 'g22', 'r11', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l23', 'g23', 'r11', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l24', 'g24', 'r12', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l25', 'g25', 'r12', NULL, NULL, 'Jasa', 'manual', 1, 5000, 1, 0, 5000);
    `);

    const { records, pairs } = await run(analyticsLayer, (a) =>
      a.get.productPairs(FROM, TO, "incoming"),
    );

    // Six records hold a catalogued product: r1, r5, r6, r7, r8 and r12. r9 is a
    // purchase, r10 is deleted, r11 is an adjustment, and the seed's r3 has no
    // lines at all.
    expect(records).toBe(6);

    // Kopi × Gula: r1, r6, r7. Four if the two lot portions of Kopi were counted
    // as two baskets, five if the purchase or the deleted/adjusted records leaked
    // in. Gula × Teh: r6, r8. Kopi × Teh met once and is not an edge.
    expect(pairs).toEqual([
      { a: "p1", b: "p2", co: 3, basketsA: 5, basketsB: 4, lift: 0.9 },
      { a: "p2", b: "p3", co: 2, basketsA: 4, basketsB: 2, lift: 1.5 },
    ]);

    // The point of carrying both numbers: Kopi × Gula is the busier pair and the
    // weaker one. Kopi is in five of six baskets, so sharing three of them says
    // almost nothing (0.9 — less than chance); Gula and Teh are rarer and always
    // together (1.5). Ranking by count alone would put the first one on top.
    expect(pairs[0]!.lift).toBeLessThan(pairs[1]!.lift);
  });

  test("pairs are counted per direction", async () => {
    const { analyticsLayer, db } = setup();
    // The seed's r1 holds Kopi + Gula on the sales side. These two are the same
    // pair on the purchase side, twice — the same shape as r1, pointing the other
    // way, and it must not touch the sales network.
    db.exec(`
      INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag
      ) VALUES
        ('r9',  ${at(0, 17)}, ${at(0, 17)}, 0, NULL, 'Ali', 'outcoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 17)}, NULL, NULL, 0),
        ('r13', ${at(0, 18)}, ${at(0, 18)}, 0, NULL, 'Ali', 'outcoming', 0, '', 0,
          '', '', 0, 0, ${at(0, 18)}, NULL, NULL, 0);

      INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES
        ('l18', 'g18', 'r9',  NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l19', 'g19', 'r9',  NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000),
        ('l20', 'g20', 'r13', NULL, 'p1', 'Kopi', 'retail', 1, 50000, 1, 0, 50000),
        ('l21', 'g21', 'r13', NULL, 'p2', 'Gula', 'retail', 1, 20000, 1, 0, 20000);
    `);

    const sales = await run(analyticsLayer, (a) => a.get.productPairs(FROM, TO, "incoming"));
    const purchases = await run(analyticsLayer, (a) =>
      a.get.productPairs(FROM, TO, "outcoming"),
    );

    // Sales: r1 and r5, still no repeating pair — the two purchases added nothing.
    expect(sales).toEqual({ records: 2, pairs: [] });
    // Purchases: two records holding the same two products, so the pair is real
    // in exactly the direction its own count earns (2/2 × 2/2 = 1).
    expect(purchases).toEqual({
      records: 2,
      pairs: [{ a: "p1", b: "p2", co: 2, basketsA: 2, basketsB: 2, lift: 1 }],
    });
  });

  test("lift never returns a value the canvas cannot scale", () => {
    expect(pairLift(3, 5, 4, 6)).toBeCloseTo(0.9);
    // A quiet week, and a product the period never saw, are both "no relationship"
    // rather than NaN/Infinity — a NaN scaled canvas draws nothing at all.
    expect(pairLift(0, 0, 4, 6)).toBe(0);
    expect(pairLift(2, 4, 2, 0)).toBe(0);
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
