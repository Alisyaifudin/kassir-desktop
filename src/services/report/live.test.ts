import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { linesSubtotal, recalcExtras } from "~/lib/purchase";
import { makeTestDatabase } from "../db/test-support";
import { ReportService, type ReportTotals } from ".";
import { ReportLive } from "./live";

/**
 * The report's reads.
 *
 * The claims worth proving here are not "the query returns rows" — they are the
 * three things a financial report is worthless without:
 *
 *   1. **It reconciles.** The money grouped by category for a record adds up to
 *      that record's own `record_total`. The line amounts are re-derived from
 *      `price × qty − discounts` and `record_extra_eff`, which is how submit
 *      derived `record_sub_total` and `record_total` in the first place, so this
 *      asserts the report's arithmetic against `lib/purchase`'s rather than
 *      against a number typed into a test.
 *   2. **It counts the same set `/analytics` does.** Deleted records out,
 *      hand-typed adjustments out, a record on its effective date.
 *   3. **A discount is subtracted once per line, not once per lot portion.** The
 *      bug the `discounts_by_line` CTE exists to prevent.
 */
const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
const at = (daysAgo: number, hour: number) =>
  today.subtract(Temporal.Duration.from({ days: daysAgo })).add({ hours: hour }).epochMilliseconds;

const FROM = today.epochMilliseconds;
const TO = today.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;

function run<A>(
  layer: Layer.Layer<ReportService>,
  f: (r: Context.Tag.Service<typeof ReportService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const report = yield* ReportService;
      return yield* f(report);
    }).pipe(Effect.provide(layer)),
  );
}

type Db = ReturnType<typeof makeTestDatabase>["db"];

/** A record row, with the totals the caller says it was stored with. */
function record(
  db: Db,
  id: string,
  input: {
    mode?: "incoming" | "outcoming";
    hour: number;
    subTotal: number;
    total: number;
    rounding?: number;
    flag?: number;
    paidAt?: number | null;
    creditAt?: number | null;
    pairId?: string | null;
  },
): void {
  const when = at(0, input.hour);
  db.query(
    `INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
      ) VALUES (?, ?, ?, ?, ?, 'Budi', ?, ?, '', 0, '', '', ?, ?, ?, NULL, NULL, ?, ?)`,
  ).run(
    id,
    when,
    input.paidAt === undefined ? when : input.paidAt,
    input.rounding ?? 0,
    input.creditAt ?? null,
    input.mode ?? "incoming",
    input.total,
    input.subTotal,
    input.total,
    when,
    input.flag ?? 0,
    input.pairId ?? null,
  );
}

/** One portion of a listing line. Same `group` = same entered line. */
function portion(
  db: Db,
  recordId: string,
  group: string,
  input: { price: number; qty: number; capital?: number },
): string {
  const id = `p-${group}-${Math.round(Math.random() * 1e9)}`;
  db.query(
    `INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, record_listing_name,
        record_listing_price, record_listing_qty, record_listing_capital, record_listing_total
      ) VALUES (?, ?, ?, 'Hanasui', ?, ?, ?, ?)`,
  ).run(id, group, recordId, input.price, input.qty, input.capital ?? 0, input.price * input.qty);
  return id;
}

function extra(db: Db, recordId: string, name: string, eff: number, flag = 0): string {
  const id = `e-${recordId}-${name}`;
  db.query(
    `INSERT INTO record_extras (
        record_extra_id, record_extra_name, record_id,
        record_extra_value, record_extra_eff, record_extra_kind, record_extra_flag
      ) VALUES (?, ?, ?, ?, ?, 'number', ?)`,
  ).run(id, name, recordId, eff, eff, flag);
  return id;
}

/** A discount typed on a line, copied onto the portion it was entered on. */
function discount(db: Db, portionId: string, group: string, eff: number): void {
  db.query(
    `INSERT INTO discounts (discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff)
     VALUES (?, ?, ?, 'number', ?, ?)`,
  ).run(`d-${group}-${Math.round(Math.random() * 1e9)}`, `dg-${group}`, portionId, eff, eff);
}

/**
 * Classify a listing line. `report_line_source_rev` is the record's own
 * `record_updated_at`, exactly as `seedDefaults` writes it — a classification
 * snapshots the record it described, not the clock.
 */
function classifyListing(db: Db, recordId: string, group: string, slug: string): void {
  db.query(
    `INSERT INTO report_lines (
        report_line_id, record_id, record_listing_group_id, record_extra_id,
        report_category_id, report_line_source_rev, report_line_auto, report_line_at
      ) VALUES (
        ?, ?, ?, NULL,
        (SELECT report_category_id FROM report_categories WHERE report_category_slug = ?),
        (SELECT record_updated_at FROM records WHERE record_id = ?), 1, ?)`,
  ).run(`rl-${group}`, recordId, group, slug, recordId, Date.now());
}

function classifyExtra(db: Db, recordId: string, extraId: string, slug: string): void {
  db.query(
    `INSERT INTO report_lines (
        report_line_id, record_id, record_listing_group_id, record_extra_id,
        report_category_id, report_line_source_rev, report_line_auto, report_line_at
      ) VALUES (
        ?, ?, NULL, ?,
        (SELECT report_category_id FROM report_categories WHERE report_category_slug = ?),
        (SELECT record_updated_at FROM records WHERE record_id = ?), 1, ?)`,
  ).run(`re-${extraId}`, recordId, extraId, slug, recordId, Date.now());
}

function startDay(db: Db): void {
  db.query(
    `INSERT INTO report_periods (
        report_period_id, report_period_kind, report_period_start, report_period_end,
        report_period_created_at, report_period_updated_at
      ) VALUES ('day-1', 'day', ?, ?, 1, 1)`,
  ).run(FROM, TO);
}

/** A day with one sale, one purchase, and everything else the scope excludes. */
function setup() {
  const { db, layer } = makeTestDatabase();

  // --- r1: a sale. Two goods lines + Ongkir.
  //   goods: 2 × 20.000 = 40.000 and 1 × 10.000 = 10.000
  //   discount on the first line: −5.000  → net 35.000
  //   sub_total 45.000, Ongkir +5.000, total 50.000
  record(db, "r1", { hour: 10, subTotal: 45_000, total: 50_000 });
  const g1 = portion(db, "r1", "g1", { price: 20_000, qty: 2 });
  portion(db, "r1", "g2", { price: 10_000, qty: 1 });
  discount(db, g1, "g1", 5_000);
  extra(db, "r1", "Ongkir", 5_000);

  // --- r2: a purchase of goods.
  record(db, "r2", { mode: "outcoming", hour: 11, subTotal: 30_000, total: 30_000 });
  portion(db, "r2", "g3", { price: 15_000, qty: 2 });

  // --- r3: a sale split across two lots. One line, two portions.
  //   The discount is stored once per portion — the double-subtract trap.
  record(db, "r3", { hour: 12, subTotal: 26_000, total: 26_000 });
  const a = portion(db, "r3", "g4", { price: 15_000, qty: 1 });
  const b = portion(db, "r3", "g4", { price: 15_000, qty: 1 });
  discount(db, a, "g4", 4_000);
  discount(db, b, "g4", 4_000);

  // --- excluded from every figure
  record(db, "r4", { hour: 13, subTotal: 9_999, total: 9_999, flag: 1 }); // hand-typed
  record(db, "r5", { hour: 14, subTotal: 8_888, total: 8_888, paidAt: at(3, 9) }); // another day

  return { db, reportLayer: ReportLive.pipe(Layer.provide(layer)) };
}

describe("the day's rail", () => {
  test("lists the scope's records oldest first, with their line counts", async () => {
    const { db, reportLayer } = setup();

    const day = await run(reportLayer, (r) => r.get.day(FROM, TO));

    expect(day.started).toBe(false);
    expect(day.records.map((row) => row.id)).toEqual(["r1", "r2", "r3"]);
    expect(day.records[0]).toMatchObject({
      mode: "incoming",
      lines: 3, // 2 goods lines + Ongkir
      unclassified: 3,
      stale: 0,
      grandTotal: 50_000,
    });
    expect(day.records[1]).toMatchObject({ mode: "outcoming", lines: 1, grandTotal: 30_000 });
    // Two portions of one line are still one line.
    expect(day.records[2]).toMatchObject({ lines: 1, grandTotal: 26_000 });

    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 0 });
  });

  test("started is true once the day has a report row", async () => {
    const { db, reportLayer } = setup();
    startDay(db);

    expect((await run(reportLayer, (r) => r.get.day(FROM, TO))).started).toBe(true);
  });
});

describe("progress", () => {
  test("counts lines, and reaches zero once every line has a category", async () => {
    const { db, reportLayer } = setup();

    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toEqual({
      records: 3,
      lines: 5,
      unclassified: 5,
      stale: 0,
    });

    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");
    classifyListing(db, "r2", "g3", "beli");
    classifyListing(db, "r3", "g4", "jual");

    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toEqual({
      records: 3,
      lines: 5,
      unclassified: 0,
      stale: 0,
    });
  });

  test("a line goes stale when its record moves after being classified", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");
    classifyListing(db, "r2", "g3", "beli");
    classifyListing(db, "r3", "g4", "jual");

    // The operator edits r1's note an hour later; its classifications now
    // describe a record that has moved.
    db.query(`UPDATE records SET record_updated_at = ? WHERE record_id = 'r1'`).run(
      at(0, 10) + 60_000,
    );

    const progress = await run(reportLayer, (r) => r.get.progress(FROM, TO));
    expect(progress).toMatchObject({ unclassified: 0, stale: 3 });

    const day = await run(reportLayer, (r) => r.get.day(FROM, TO));
    expect(day.records[0]).toMatchObject({ stale: 3 });
    expect(day.records[1]).toMatchObject({ stale: 0 });
  });
});

describe("the per-line classification", () => {
  test("comes back keyed by the id the UI uses", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");

    const lines = await run(reportLayer, (r) => r.get.lines("r1"));

    expect(lines.map((line) => [line.lineId, line.source])).toEqual([
      ["g1", "listing"],
      ["e-r1-Ongkir", "extra"],
    ]);
    expect(lines[0]).toMatchObject({ auto: true, sourceRev: expect.any(Number) });
  });

  test("an unclassified line is simply absent", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");

    const lines = await run(reportLayer, (r) => r.get.lines("r1"));

    expect(lines).toHaveLength(1);
    expect(lines[0]?.lineId).toBe("g1");
  });
});

describe("the report body reconciles with the records it describes", () => {
  /** Σ of a range's category totals, per direction. */
  function sumBy(total: ReportTotals) {
    return total.categories.reduce(
      (acc, row) => {
        acc[row.mode] += row.total;
        return acc;
      },
      { incoming: 0, outcoming: 0 },
    );
  }

  test("every line of a record adds up to its record_total", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");
    classifyListing(db, "r2", "g3", "beli");
    classifyListing(db, "r3", "g4", "jual");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));
    const sums = sumBy(totals);

    // r1 50.000 + r3 26.000 = 76.000 in; r2 30.000 out.
    expect(sums.incoming).toBe(76_000);
    expect(sums.outcoming).toBe(30_000);
    expect(totals.unclassified).toBe(0);
  });

  test("the derivation the report uses is the one submit uses", async () => {
    // Recompute r1's totals with `lib/purchase` — the helpers `transaction
    // .submit` calls — and check the report agrees, so this test breaks if the
    // line-amount SQL and the domain formula ever drift apart.
    const goods = [
      { price: 20_000, qty: 2, discounts: [{ value: 5_000, kind: "number" as const, eff: 5_000, total: 35_000 }] },
      { price: 10_000, qty: 1, discounts: [] },
    ];
    const subTotal = linesSubtotal(goods).toNumber();
    const effects = recalcExtras([{ kind: "number", value: 5_000 }], linesSubtotal(goods));
    const total = effects.reduce((sum, effect) => sum.plus(effect.eff), linesSubtotal(goods)).toNumber();

    expect(subTotal).toBe(45_000);
    expect(total).toBe(50_000);

    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));
    const r1 = totals.categories
      .filter((row) => row.mode === "incoming")
      .reduce((sum, row) => sum + row.total, 0);

    expect(r1).toBe(total);
  });

  test("a discount on a line split across lots is subtracted once", async () => {
    // r3: 2 portions × (15.000 × 1) = 30.000, one 4.000 discount copied onto each
    // portion. Net must be 26.000 — not 22.000 (subtracted twice).
    const { db, reportLayer } = setup();
    classifyListing(db, "r3", "g4", "jual");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));
    const line = totals.categories.find((row) => row.mode === "incoming" && row.total === 26_000);

    expect(line).toBeDefined();
    expect(line?.lines).toBe(1);
  });

  test("categories come back in the seeded order, split by direction", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");
    classifyListing(db, "r2", "g3", "beli");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));

    expect(totals.categories.map((row) => [row.slug, row.mode])).toEqual([
      ["beli", "outcoming"],
      ["jual", "incoming"],
      ["ongkir", "incoming"],
    ]);
  });

  test("undecided lines are counted, not silently folded into a category", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));

    expect(totals.categories).toHaveLength(1);
    expect(totals.unclassified).toBe(4);
    expect(totals.lines).toBe(5);
  });

  test("rounding is its own figure, so the categories still reconcile", async () => {
    const { db, reportLayer } = setup();
    db.query(`UPDATE records SET record_rounding = 500 WHERE record_id = 'r2'`).run();
    classifyListing(db, "r2", "g3", "beli");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));

    // `outcoming` is the grand total the operator saw — 30.500 — while the goods
    // themselves are 30.000, and the 500 is reported separately.
    expect(totals.outcoming).toBe(30_500);
    expect(totals.rounding).toBe(500);
    expect(totals.categories.find((row) => row.slug === "beli")?.total).toBe(30_000);
  });
});

describe("Abaikan — lines kept out of the report", () => {
  test("a line marked abaikan contributes to nothing, and is listed", async () => {
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");
    classifyListing(db, "r2", "g3", "beli");
    classifyListing(db, "r3", "g4", "abaikan");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));

    // r3's 26.000 is gone from the incoming figure…
    expect(totals.incoming).toBe(50_000);
    expect(totals.categories.some((row) => row.slug === "abaikan")).toBe(false);
    // …and named in the section instead, so the figures above can be audited.
    expect(totals.excluded).toEqual([{ name: "Hanasui", mode: "incoming", total: 26_000 }]);
    // It is classified, so it does not block the day.
    expect(totals.unclassified).toBe(0);
  });

  test("the printed totals equal the rows printed under them", async () => {
    // The reason `SELECT_MODE_TOTALS` is summed over lines: a report whose total
    // contradicts its own table is worse than one with no total at all.
    const { db, reportLayer } = setup();
    classifyListing(db, "r1", "g1", "jual");
    classifyListing(db, "r1", "g2", "jual");
    classifyExtra(db, "r1", "e-r1-Ongkir", "ongkir");
    classifyListing(db, "r2", "g3", "beli");
    classifyListing(db, "r3", "g4", "abaikan");
    db.query(`UPDATE records SET record_rounding = 500 WHERE record_id = 'r1'`).run();

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));

    for (const mode of ["incoming", "outcoming"] as const) {
      const rows = totals.categories
        .filter((row) => row.mode === mode)
        .reduce((sum, row) => sum + row.total, 0);
      expect(totals[mode]).toBe(rows + (mode === "incoming" ? 500 : 0));
    }
  });

  test("excluding every line of a day leaves a report of zeroes, not an error", async () => {
    const { db, reportLayer } = setup();
    for (const [record, line, source] of [
      ["r1", "g1", "listing"],
      ["r1", "g2", "listing"],
      ["r2", "g3", "listing"],
      ["r3", "g4", "listing"],
    ] as const) {
      if (source === "listing") classifyListing(db, record, line, "abaikan");
    }
    classifyExtra(db, "r1", "e-r1-Ongkir", "abaikan");

    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));

    expect(totals.categories).toEqual([]);
    expect(totals.excluded).toHaveLength(5);
    expect(totals.incoming).toBe(0);
    expect(totals.unclassified).toBe(0);
  });
});

describe("days — the period rail", () => {
  test("one entry per day, with that day's figures", async () => {
    const { db, reportLayer } = setup();
    // A record two days ago, and a settled credit rung up then and paid today.
    record(db, "old", { hour: 9, subTotal: 7_000, total: 7_000 });
    db.query(`UPDATE records SET record_created_at = ?, record_paid_at = ? WHERE record_id = 'old'`).run(
      at(2, 9),
      at(2, 9),
    );
    classifyListing(db, "r1", "g1", "jual");
    startDay(db);

    const days = await run(reportLayer, (r) =>
      r.get.days(today.subtract(Temporal.Duration.from({ days: 2 })).epochMilliseconds, TO),
    );

    expect(days.map((d) => d.records)).toEqual([1, 3]);
    // Each entry is a local midnight, which is what the rail renders.
    for (const day of days) {
      expect(Temporal.Instant.fromEpochMilliseconds(day.day).toZonedDateTimeISO(tz).hour).toBe(0);
    }
    // `started` is per day, and only today has a report row.
    expect(days.map((d) => d.started)).toEqual([false, true]);
    expect(days[1]).toMatchObject({ lines: 5, unclassified: 4 });
  });
});

describe("categories", () => {
  test("the six built-ins, in order", async () => {
    const { reportLayer } = setup();

    const categories = await run(reportLayer, (r) => r.get.categories());

    expect(categories.map((c) => c.slug)).toEqual([
      "beli",
      "jual",
      "diskon",
      "ppn",
      "admin",
      "ongkir",
      // The seventh is not a kind of money: it is "out of the report".
      "abaikan",
    ]);
    expect(categories.every((c) => c.builtin)).toBe(true);
  });

  test("a soft-deleted category is gone from the list, and a custom one shows up", async () => {
    const { db, reportLayer } = setup();
    db.query(
      `INSERT INTO report_categories (report_category_id, report_category_name, report_category_slug, report_category_order)
       VALUES ('ADJ', 'Penyesuaian', 'penyesuaian', 6)`,
    ).run();
    db.query(`UPDATE report_categories SET report_category_deleted_at = 1 WHERE report_category_slug = 'ppn'`).run();

    const categories = await run(reportLayer, (r) => r.get.categories());

    expect(categories.map((c) => c.slug)).not.toContain("ppn");
    expect(categories.find((c) => c.slug === "penyesuaian")).toMatchObject({
      name: "Penyesuaian",
      builtin: false,
      order: 6,
    });
  });
});
