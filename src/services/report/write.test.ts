import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Option, Stream } from "effect";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { makeTestDatabase } from "../db/test-support";
import { ReportService } from ".";
import { ReportLive } from "./live";

/**
 * The report's writes: `Buat laporan`, one line at a time, and closing a period.
 *
 * What is pinned here is the behaviour the screen depends on, not the SQL:
 * seeding is idempotent and additive, an operator's answer is never overwritten by
 * a re-seed, an extra's answer is remembered for next time, and a period cannot be
 * closed over unfinished work.
 */
const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
const at = (daysAgo: number, hour: number) =>
  today.subtract(Temporal.Duration.from({ days: daysAgo })).add({ hours: hour }).epochMilliseconds;

const FROM = today.epochMilliseconds;
const TO = today.add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
const YESTERDAY = today.subtract(Temporal.Duration.from({ days: 1 })).epochMilliseconds;

type Layer2 = Layer.Layer<ReportService>;
type Db = ReturnType<typeof makeTestDatabase>["db"];

function run<A>(layer: Layer2, f: (r: Context.Tag.Service<typeof ReportService>) => Effect.Effect<A, unknown>) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const report = yield* ReportService;
      return yield* f(report);
    }).pipe(Effect.provide(layer)),
  );
}

/** The message of a write that is expected to be refused. */
async function refusal(
  layer: Layer2,
  f: (r: Context.Tag.Service<typeof ReportService>) => Effect.Effect<unknown, { message: string }>,
): Promise<string> {
  const either = await run(layer, (r) => Effect.either(f(r)));
  if (either._tag === "Right") throw new Error("expected a refusal, got success");
  return either.left.message;
}

function record(
  db: Db,
  id: string,
  input: {
    mode?: "incoming" | "outcoming";
    daysAgo?: number;
    hour?: number;
    subTotal: number;
    total: number;
  },
): void {
  const when = at(input.daysAgo ?? 0, input.hour ?? 10);
  db.query(
    `INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
      ) VALUES (?, ?, ?, 0, NULL, 'Budi', ?, ?, '', 0, '', '', ?, ?, ?, NULL, NULL, 0, NULL)`,
  ).run(id, when, when, input.mode ?? "incoming", input.total, input.subTotal, input.total, when);
}

/** A listing line. Same `group` twice = one line, two lot portions. */
function portion(db: Db, recordId: string, group: string, price = 20_000, qty = 1): void {
  db.query(
    `INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, record_listing_name,
        record_listing_price, record_listing_qty, record_listing_capital, record_listing_total
      ) VALUES (?, ?, ?, 'Hanasui', ?, ?, 0, ?)`,
  ).run(`p-${recordId}-${group}-${price}-${qty}`, group, recordId, price, qty, price * qty);
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

/** `DUAL_FLAG` — the charge books twice, so the sale's own line is pass-through. */
const DUAL_FLAG = 1;

/** One day: a sale with two goods lines and an Ongkir, and a purchase. */
function setup() {
  const { db, layer } = makeTestDatabase();

  record(db, "r1", { hour: 10, subTotal: 45_000, total: 50_000 });
  portion(db, "r1", "g1", 20_000, 2);
  portion(db, "r1", "g2", 10_000, 1);
  extra(db, "r1", "Ongkir", 5_000);

  record(db, "r2", { mode: "outcoming", hour: 11, subTotal: 30_000, total: 30_000 });
  portion(db, "r2", "g3", 15_000, 2);

  return { db, reportLayer: ReportLive.pipe(Layer.provide(layer)) };
}

/** Which category a line carries, by slug, and whether it was a guess. */
async function lineOf(layer: Layer2, recordId: string, lineId: string) {
  const categories = await run(layer, (r) => r.get.categories());
  const lines = await run(layer, (r) => r.get.lines(recordId));
  const found = lines.find((line) => line.lineId === lineId);
  if (found === undefined) return undefined;
  return {
    slug: categories.find((category) => category.id === found.categoryId)?.slug ?? "?",
    auto: found.auto,
  };
}

async function idOf(layer: Layer2, slug: string): Promise<string> {
  const categories = await run(layer, (r) => r.get.categories());
  const found = categories.find((category) => category.slug === slug);
  if (found === undefined) throw new Error(`no category ${slug}`);
  return found.id;
}

/**
 * Answer the day's one charge.
 *
 * `startDay` fills in goods and stops there, so a day is not "clean" until its
 * charges have been decided — which is the state every completion test has to
 * reach before it can assert anything about completeness.
 */
async function decideTheCharge(layer: Layer2): Promise<void> {
  const categoryId = await idOf(layer, "admin");
  await run(layer, (r) =>
    r.set.line({ recordId: "r1", source: "extra", lineId: "e-r1-Ongkir", categoryId }),
  );
}

/** The revision counter's value right now: a fresh subscription emits it first. */
function currentRevision(r: Context.Tag.Service<typeof ReportService>) {
  return Stream.runHead(r.get.revision).pipe(Effect.map((head) => Option.getOrThrow(head)));
}

describe("Buat laporan — startDay", () => {
  test("fills in the goods and nothing else", async () => {
    // The app's whole claim to knowing anything: a line of goods on a sale is
    // revenue, on a purchase it is cost. Everything else is a question.
    const { reportLayer } = setup();

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    expect(await lineOf(reportLayer, "r1", "g1")).toEqual({ slug: "jual", auto: true });
    expect(await lineOf(reportLayer, "r1", "g2")).toEqual({ slug: "jual", auto: true });
    expect(await lineOf(reportLayer, "r2", "g3")).toEqual({ slug: "beli", auto: true });
    // The charge is left for the operator: a free-text name says nothing about
    // what it means, so guessing it would be inventing context.
    expect(await lineOf(reportLayer, "r1", "e-r1-Ongkir")).toBeUndefined();
  });

  test("marks the day as started", async () => {
    const { reportLayer } = setup();

    expect((await run(reportLayer, (r) => r.get.day(FROM, TO))).started).toBe(false);
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    expect((await run(reportLayer, (r) => r.get.day(FROM, TO))).started).toBe(true);
  });

  test("writes one row per line, however many lots it drew from", async () => {
    const { db, reportLayer } = setup();
    portion(db, "r1", "g1", 20_000, 1); // a second lot of the same entered line

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    // Two goods lines on r1 and one on r2 — three classifications, no charge. The
    // listing rows are four, because g1 has two portions of its own.
    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 3 });
    expect(db.query(`SELECT COUNT(*) AS n FROM record_listings`).get()).toEqual({ n: 4 });
    expect(
      db.query(`SELECT COUNT(*) AS n FROM record_listings WHERE record_listing_group_id = 'g1'`).get(),
    ).toEqual({ n: 2 });
  });

  test("leaves the charges unclassified — that is the day's work", async () => {
    const { reportLayer } = setup();

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toEqual({
      records: 2,
      lines: 4,
      // The three goods lines are filled in; the Ongkir is a question.
      unclassified: 1,
      stale: 0,
    });
  });

  test("a second press writes nothing", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    const before = db
      .query(`SELECT report_line_id, report_line_at FROM report_lines ORDER BY 1`)
      .all();

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    expect(
      db.query(`SELECT report_line_id, report_line_at FROM report_lines ORDER BY 1`).all(),
    ).toEqual(before);
    expect(db.query(`SELECT COUNT(*) AS n FROM report_periods`).get()).toEqual({ n: 1 });
  });

  test("a re-seed never overwrites what the operator chose", async () => {
    const { reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    const admin = await idOf(reportLayer, "admin");
    await run(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "extra", lineId: "e-r1-Ongkir", categoryId: admin }),
    );

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    expect(await lineOf(reportLayer, "r1", "e-r1-Ongkir")).toEqual({
      slug: "admin",
      auto: false,
    });
  });

  test("a record that lands after the first press is picked up by the next", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    record(db, "r3", { hour: 12, subTotal: 7_000, total: 7_000 });
    portion(db, "r3", "g9", 7_000, 1);

    // The Ongkir plus the new line.
    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toMatchObject({
      unclassified: 2,
    });

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    expect(await lineOf(reportLayer, "r3", "g9")).toEqual({ slug: "jual", auto: true });
    // Only the charge is left.
    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toMatchObject({
      unclassified: 1,
    });
  });

  test("excludes a dual charge, because the row says it books twice", async () => {
    // The one extra that *is* filled in — and not because of its name. `DUAL_FLAG`
    // is a fact about the row: the sale carries the charge and commits an
    // extras-only twin for the same money, which `scope.sql` keeps out. Counting
    // the sale's own line would count money the shop both earned and spent.
    const { db, layer } = makeTestDatabase();
    record(db, "r1", { hour: 10, subTotal: 10_000, total: 20_000 });
    portion(db, "r1", "g1", 10_000, 1);
    extra(db, "r1", "Ongkir", 10_000, DUAL_FLAG);
    extra(db, "r1", "Admin", 500, 0);
    const reportLayer = ReportLive.pipe(Layer.provide(layer));

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    expect(await lineOf(reportLayer, "r1", "e-r1-Ongkir")).toEqual({
      slug: "abaikan",
      auto: true,
    });
    // Everything else is still a question.
    expect(await lineOf(reportLayer, "r1", "e-r1-Admin")).toBeUndefined();
    expect(await lineOf(reportLayer, "r1", "g1")).toEqual({ slug: "jual", auto: true });

    // And it shows up where excluded lines go, with the moment it happened.
    const totals = await run(reportLayer, (r) => r.get.totals(FROM, TO));
    expect(totals.excluded.map((row) => [row.name, row.mode, row.total])).toEqual([
      ["Ongkir", "incoming", 10_000],
    ]);
    // Out of the figures, so Jual is the goods only.
    expect(totals.categories.find((row) => row.slug === "jual")?.total).toBe(10_000);
  });

  test("never remembers a charge, however often it has been classified", async () => {
    // The owner's rule: a charge name is a string with no meaning the app can
    // infer. Answering it once — even three times, in three spellings — does not
    // license an assumption on the next record.
    const { db, layer } = makeTestDatabase();
    record(db, "past", { daysAgo: 1, hour: 10, subTotal: 5_000, total: 5_000 });
    extra(db, "past", "Ongkir", 5_000);
    record(db, "now", { hour: 10, subTotal: 5_000, total: 5_000 });
    extra(db, "now", "Ongkir", 5_000);
    extra(db, "now", "ongkir", 7_000);
    const reportLayer = ReportLive.pipe(Layer.provide(layer));

    await run(reportLayer, (r) => r.set.startDay(YESTERDAY, FROM));
    const ppn = await idOf(reportLayer, "ppn");
    await run(reportLayer, (r) =>
      r.set.line({ recordId: "past", source: "extra", lineId: "e-past-Ongkir", categoryId: ppn }),
    );

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    // Not carried over, and not carried across spellings either.
    expect(await lineOf(reportLayer, "now", "e-now-Ongkir")).toBeUndefined();
    expect(await lineOf(reportLayer, "now", "e-now-ongkir")).toBeUndefined();
  });

  test("snapshots the record's own updated_at, not the clock", async () => {
    const { db, reportLayer } = setup();

    await run(reportLayer, (r) => r.set.startDay(FROM, TO));

    const rows = db
      .query(
        `SELECT rl.report_line_source_rev AS rev, r.record_updated_at AS at
           FROM report_lines rl JOIN records r ON r.record_id = rl.record_id`,
      )
      .all() as { rev: number; at: number }[];

    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.rev).toBe(row.at);
    // …so a freshly seeded day is not immediately stale.
    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toMatchObject({ stale: 0 });
  });
});

describe("one line at a time — set.line", () => {
  test("works before the day is started, too", async () => {
    const { reportLayer } = setup();
    const ppn = await idOf(reportLayer, "ppn");

    await run(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "listing", lineId: "g1", categoryId: ppn }),
    );

    expect(await lineOf(reportLayer, "r1", "g1")).toEqual({ slug: "ppn", auto: false });
  });

  test("re-classifying twice keeps one row and the last answer", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    const admin = await idOf(reportLayer, "admin");
    const ppn = await idOf(reportLayer, "ppn");

    await run(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "extra", lineId: "e-r1-Ongkir", categoryId: admin }),
    );
    await run(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "extra", lineId: "e-r1-Ongkir", categoryId: ppn }),
    );

    expect(await lineOf(reportLayer, "r1", "e-r1-Ongkir")).toEqual({ slug: "ppn", auto: false });
    expect(
      db.query(`SELECT COUNT(*) AS n FROM report_lines WHERE record_extra_id = 'e-r1-Ongkir'`).get(),
    ).toEqual({ n: 1 });
  });

  test("an unknown category is refused, and nothing is written", async () => {
    const { db, reportLayer } = setup();

    const message = await refusal(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "listing", lineId: "g1", categoryId: "GHOST" }),
    );

    expect(message).toBe("Kategori tidak ditemukan.");
    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 0 });
  });

  test("a soft-deleted category is refused", async () => {
    const { db, reportLayer } = setup();
    const ppn = await idOf(reportLayer, "ppn");
    db.query(
      `UPDATE report_categories SET report_category_deleted_at = 1 WHERE report_category_id = ?`,
    ).run(ppn);

    const message = await refusal(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "listing", lineId: "g1", categoryId: ppn }),
    );

    expect(message).toBe("Kategori tidak ditemukan.");
  });

  test("a line that belongs to another record is refused", async () => {
    const { db, reportLayer } = setup();
    const ppn = await idOf(reportLayer, "ppn");

    // `g1` is r1's line, not r2's.
    const message = await refusal(reportLayer, (r) =>
      r.set.line({ recordId: "r2", source: "listing", lineId: "g1", categoryId: ppn }),
    );

    expect(message).toBe("Baris itu bukan milik rekaman tersebut.");
    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 0 });
  });

  test("classifying an edited record clears its stale flag", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    db.query(`UPDATE records SET record_updated_at = ? WHERE record_id = 'r1'`).run(
      at(0, 10) + 60_000,
    );

    // r1's two goods lines were classified; its Ongkir never was, so only two can
    // go stale.
    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toMatchObject({ stale: 2 });

    const admin = await idOf(reportLayer, "admin");
    for (const [source, lineId] of [
      ["listing", "g1"],
      ["listing", "g2"],
    ] as const) {
      await run(reportLayer, (r) =>
        r.set.line({ recordId: "r1", source, lineId, categoryId: admin }),
      );
    }

    expect(await run(reportLayer, (r) => r.get.progress(FROM, TO))).toMatchObject({ stale: 0 });
  });
});

describe("closing a period — set.close", () => {
  test("refuses over unclassified lines, and says how many", async () => {
    const { db, reportLayer } = setup();

    const message = await refusal(reportLayer, (r) => r.set.close("week", FROM, TO));

    expect(message).toBe("Masih ada 4 baris yang belum diklasifikasi.");
    expect(db.query(`SELECT COUNT(*) AS n FROM report_periods`).get()).toEqual({ n: 0 });
  });

  test("refuses over stale lines, with a different sentence", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    // Decide the charge first: `close` reports unfinished work before stale work,
    // so leaving it open would test the wrong refusal.
    const admin = await idOf(reportLayer, "admin");
    await run(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "extra", lineId: "e-r1-Ongkir", categoryId: admin }),
    );
    db.query(`UPDATE records SET record_updated_at = ? WHERE record_id = 'r1'`).run(
      at(0, 10) + 60_000,
    );

    const message = await refusal(reportLayer, (r) => r.set.close("week", FROM, TO));

    // All three of r1's classified lines — two goods and the charge — were decided
    // before the record moved, so all three are stale.
    expect(message).toBe("Ada 3 baris yang rekamannya berubah setelah diklasifikasi.");
  });

  test("closes a clean range, and is idempotent", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    await decideTheCharge(reportLayer);

    await run(reportLayer, (r) => r.set.close("week", FROM, TO));
    await run(reportLayer, (r) => r.set.close("week", FROM, TO));

    const rows = db
      .query(
        `SELECT report_period_final AS final, report_period_final_at AS at
           FROM report_periods WHERE report_period_kind = 'week'`,
      )
      .all() as { final: number; at: number | null }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.final).toBe(1);
    expect(rows[0]?.at).toBeGreaterThan(0);
  });

  test("closing does not fold the day rows into the period", async () => {
    // §3.3: period closure is a claim, not a snapshot.
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    await decideTheCharge(reportLayer);
    await run(reportLayer, (r) => r.set.close("week", FROM, TO));

    expect(
      db.query(`SELECT COUNT(*) AS n FROM report_periods WHERE report_period_kind = 'day'`).get(),
    ).toEqual({ n: 1 });
  });
});

describe("categories", () => {
  test("a custom one gets a slug from its name and the next order", async () => {
    const { reportLayer } = setup();

    const added = await run(reportLayer, (r) => r.add.category("  Penyesuaian  "));

    expect(added).toMatchObject({
      name: "Penyesuaian",
      slug: "penyesuaian",
      builtin: false,
      // Six built-ins, then `Abaikan` (migration 64), so the next one is 7th.
      order: 7,
    });
    const listed = await run(reportLayer, (r) => r.get.categories());
    expect(listed.find((category) => category.id === added.id)).toEqual(added);
  });

  test("a name that slugs onto a taken one gets a suffix instead of a refusal", async () => {
    const { reportLayer } = setup();
    await run(reportLayer, (r) => r.add.category("Penyesuaian"));

    expect((await run(reportLayer, (r) => r.add.category("PENYESUAIAN!"))).slug).toBe(
      "penyesuaian-2",
    );
  });

  test("a symbol-only name still gets a usable slug", async () => {
    const { reportLayer } = setup();
    expect((await run(reportLayer, (r) => r.add.category("***"))).slug).toBe("kategori");
  });

  test("an empty name is refused", async () => {
    const { reportLayer } = setup();
    expect(await refusal(reportLayer, (r) => r.add.category("   "))).toBe(
      "Nama kategori harus diisi.",
    );
  });

  test("rename keeps the slug, so the handle does not move", async () => {
    const { reportLayer } = setup();
    const beli = await idOf(reportLayer, "beli");

    await run(reportLayer, (r) => r.set.category(beli, "Pembelian"));

    const listed = await run(reportLayer, (r) => r.get.categories());
    expect(listed.find((category) => category.id === beli)).toMatchObject({
      name: "Pembelian",
      slug: "beli",
    });
  });

  test("reorder assigns 0..n-1 in the order given", async () => {
    const { reportLayer } = setup();
    const before = await run(reportLayer, (r) => r.get.categories());
    const reversed = before.map((category) => category.id).reverse();

    await run(reportLayer, (r) => r.set.categoryOrder(reversed));

    const after = await run(reportLayer, (r) => r.get.categories());
    expect(after.map((category) => category.id)).toEqual(reversed);
    expect(after.map((category) => category.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test("a built-in cannot be removed at all", async () => {
    // The six built-ins are the vocabulary the service itself reads: the seed asks
    // for `jual`/`beli` by slug, and `abaikan` is what keeps an excluded line out
    // of the totals. Deleting one would fail quietly — the seed would write NULL
    // into a NOT NULL column and be skipped — so it is refused with a sentence.
    const { reportLayer } = setup();
    const jual = await idOf(reportLayer, "jual");

    expect(await refusal(reportLayer, (r) => r.delete.category(jual))).toBe(
      "Kategori bawaan tidak bisa dihapus. Tambahkan kategori baru bila perlu.",
    );
  });

  test("a custom category in use is refused, and says how many lines", async () => {
    const { db, reportLayer } = setup();
    await run(reportLayer, (r) => r.set.startDay(FROM, TO));
    const added = await run(reportLayer, (r) => r.add.category("Sementara"));
    await run(reportLayer, (r) =>
      r.set.line({ recordId: "r1", source: "extra", lineId: "e-r1-Ongkir", categoryId: added.id }),
    );

    expect(await refusal(reportLayer, (r) => r.delete.category(added.id))).toBe(
      "Kategori ini dipakai 1 baris laporan, jadi belum bisa dihapus.",
    );
    // Still there — and still named, which is what a past report needs.
    expect(
      (await run(reportLayer, (r) => r.get.categories())).some((c) => c.id === added.id),
    ).toBe(true);
    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 4 });
  });

  test("a second category with the same name is refused in the operator's words", async () => {
    const { reportLayer } = setup();
    await run(reportLayer, (r) => r.add.category("Penyesuaian"));

    expect(await refusal(reportLayer, (r) => r.add.category("penyesuaian"))).toBe(
      "Nama kategori itu sudah ada.",
    );
    // …and the six built-ins are names too.
    expect(await refusal(reportLayer, (r) => r.add.category("Jual"))).toBe(
      "Nama kategori itu sudah ada.",
    );
  });

  test("a rename onto a name already in use is refused", async () => {
    const { reportLayer } = setup();
    const added = await run(reportLayer, (r) => r.add.category("Penyesuaian"));
    const ppn = await idOf(reportLayer, "ppn");

    expect(await refusal(reportLayer, (r) => r.set.category(added.id, "PPN"))).toBe(
      "Nama kategori itu sudah ada.",
    );
    // Renaming to its own name is not a collision with itself.
    await run(reportLayer, (r) => r.set.category(ppn, "PPN"));
  });

  test("an unused category can be removed, and disappears from the list", async () => {
    const { reportLayer } = setup();
    const added = await run(reportLayer, (r) => r.add.category("Sementara"));

    await run(reportLayer, (r) => r.delete.category(added.id));

    expect(
      (await run(reportLayer, (r) => r.get.categories())).some((c) => c.id === added.id),
    ).toBe(false);
  });
});

describe("revision", () => {
  // The counter lives on the service instance, and `Effect.provide` builds the
  // layer afresh — so both readings have to share one run. That is also how the
  // page sees it: one long-lived service, a subscription that keeps re-reading.
  test("a write bumps it, so an open page re-reads", async () => {
    const { reportLayer } = setup();

    const seen = await run(reportLayer, (r) =>
      Effect.gen(function* () {
        const before = yield* currentRevision(r);
        yield* r.set.startDay(FROM, TO);
        return { before, after: yield* currentRevision(r) };
      }),
    );

    expect(seen.after).toBeGreaterThan(seen.before);
  });

  test("a refused write does not bump it", async () => {
    const { reportLayer } = setup();

    const seen = await run(reportLayer, (r) =>
      Effect.gen(function* () {
        const before = yield* currentRevision(r);
        yield* Effect.either(r.add.category(""));
        return { before, after: yield* currentRevision(r) };
      }),
    );

    expect(seen.after).toBe(seen.before);
  });
});
