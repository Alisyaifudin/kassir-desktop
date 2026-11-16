/**
 * migration-63 — the report tables.
 *
 * The migration is SQL, so the only honest test is to run it against the real
 * schema. `makeTestDatabase` applies every migration in order, so simply opening
 * the database proves 63 *executes*; what follows proves it enforces what the
 * report's write path (`services/report/live.ts`) leans on: one classification
 * per line, exactly one line identity, no anonymous category, no day without a
 * report.
 *
 * The one thing to read carefully here is what a *listing line* is. A line the
 * operator entered is stored as one `record_listings` row per stock lot it drew
 * from, all sharing a `record_listing_group_id`; `RecordListing.id` in
 * `services/record/live.ts` is that group id. So the report classifies the group,
 * and `listing()` below takes the group as its own argument.
 *
 * Run with:  bun test src/services/db/migration-63.test.ts
 */
import { describe, expect, test } from "bun:test";
import { makeTestDatabase } from "./test-support";

const NOW = 1_790_000_000_000;

type Db = ReturnType<typeof makeTestDatabase>["db"];

/** The minimum `records` row a child can hang from. */
function record(db: Db, id: string): void {
  db.query(
    `INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
      ) VALUES (?, ?, ?, 0, NULL, 'Ali', 'incoming', ?, '', 0, '', '', ?, ?, ?, NULL, NULL, 0, NULL)`,
  ).run(id, NOW, NOW, 20_000, 20_000, 20_000, NOW);
}

/**
 * One *portion* of a listing line. Two calls with the same `group` are two
 * portions of one entered line — a sale that drew from two stock lots.
 */
function listing(db: Db, id: string, recordId: string, group: string): void {
  db.query(
    `INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, record_listing_name,
        record_listing_price, record_listing_qty, record_listing_capital, record_listing_total
      ) VALUES (?, ?, ?, 'Hanasui', 20000, 1, 12000, 20000)`,
  ).run(id, group, recordId);
}

function extra(db: Db, id: string, recordId: string, name = "Ongkir"): void {
  db.query(
    `INSERT INTO record_extras (
        record_extra_id, record_extra_name, record_id,
        record_extra_value, record_extra_eff, record_extra_kind, record_extra_flag
      ) VALUES (?, ?, ?, 5000, 5000, 'number', 0)`,
  ).run(id, name, recordId);
}

function categoryId(db: Db, slug: string): string {
  const row = db
    .query(`SELECT report_category_id AS id FROM report_categories WHERE report_category_slug = ?`)
    .get(slug) as { id: string } | null;
  if (row === null) throw new Error(`no category ${slug}`);
  return row.id;
}

function classifyListing(
  db: Db,
  id: string,
  recordId: string,
  groupId: string,
  slug = "jual",
  auto = 1,
): void {
  db.query(
    `INSERT INTO report_lines (
        report_line_id, record_id, record_listing_group_id, record_extra_id,
        report_category_id, report_line_source_rev, report_line_auto, report_line_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
  ).run(id, recordId, groupId, categoryId(db, slug), NOW, auto, NOW);
}

function classifyExtra(
  db: Db,
  id: string,
  recordId: string,
  extraId: string,
  slug = "ongkir",
  auto = 1,
): void {
  db.query(
    `INSERT INTO report_lines (
        report_line_id, record_id, record_listing_group_id, record_extra_id,
        report_category_id, report_line_source_rev, report_line_auto, report_line_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
  ).run(id, recordId, extraId, categoryId(db, slug), NOW, auto, NOW);
}

describe("the three tables", () => {
  test("exist and are STRICT", () => {
    const { db } = makeTestDatabase();
    const tables = db
      .query(`SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name`)
      .all() as { name: string; sql: string }[];

    for (const name of ["report_categories", "report_lines", "report_periods"]) {
      const table = tables.find((t) => t.name === name);
      expect(table).toBeDefined();
      expect(table?.sql).toContain("STRICT");
    }
  });
});

describe("the six built-in categories", () => {
  test("are seeded in order, flagged built-in", () => {
    const { db } = makeTestDatabase();
    const rows = db
      .query(
        `SELECT report_category_name AS name, report_category_slug AS slug,
                report_category_order AS ord, report_category_builtin AS builtin,
                report_category_deleted_at AS deleted
           FROM report_categories ORDER BY report_category_order`,
      )
      .all() as {
      name: string;
      slug: string;
      ord: number;
      builtin: number;
      deleted: number | null;
    }[];

    // 63's six, in order. `migration-64` appends `Abaikan` at order 6, so this is
    // a prefix rather than the whole list — the assertion is about what *this*
    // migration seeds.
    expect(rows.slice(0, 6)).toEqual([
      { name: "Beli", slug: "beli", ord: 0, builtin: 1, deleted: null },
      { name: "Jual", slug: "jual", ord: 1, builtin: 1, deleted: null },
      { name: "Diskon", slug: "diskon", ord: 2, builtin: 1, deleted: null },
      { name: "PPN", slug: "ppn", ord: 3, builtin: 1, deleted: null },
      { name: "Admin", slug: "admin", ord: 4, builtin: 1, deleted: null },
      { name: "Ongkir", slug: "ongkir", ord: 5, builtin: 1, deleted: null },
    ]);
  });

  test("ids are the 26 characters `ulid()` mints", () => {
    // Not cosmetic: every id in the app is 26 chars, and a migration is the one
    // writer that could quietly introduce a different length.
    const { db } = makeTestDatabase();
    const rows = db.query(`SELECT report_category_id AS id FROM report_categories`).all() as {
      id: string;
    }[];

    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const row of rows) expect(row.id).toMatch(/^[0-9A-F]{26}$/);
  });

  test("a name or a slug can only be used once", () => {
    const { db } = makeTestDatabase();

    expect(() =>
      db
        .query(
          `INSERT INTO report_categories (report_category_id, report_category_name, report_category_slug)
           VALUES ('X1', 'Jual', 'jual-2')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      db
        .query(
          `INSERT INTO report_categories (report_category_id, report_category_name, report_category_slug)
           VALUES ('X2', 'Jual Lagi', 'jual')`,
        )
        .run(),
    ).toThrow();
  });

  test("a custom category is an ordinary row", () => {
    const { db } = makeTestDatabase();
    db.query(
      `INSERT INTO report_categories (report_category_id, report_category_name, report_category_slug, report_category_order)
       VALUES ('PENYESUAIAN0000000000000001', 'Penyesuaian', 'penyesuaian', 6)`,
    ).run();

    const row = db
      .query(
        `SELECT report_category_builtin AS builtin FROM report_categories WHERE report_category_slug = 'penyesuaian'`,
      )
      .get() as { builtin: number };

    expect(row.builtin).toBe(0);
  });

  test("soft delete keeps the row, so an old report can still name it", () => {
    const { db } = makeTestDatabase();
    const id = categoryId(db, "ppn");
    db.query(
      `UPDATE report_categories SET report_category_deleted_at = ? WHERE report_category_id = ?`,
    ).run(NOW, id);

    const row = db
      .query(
        `SELECT report_category_deleted_at AS deleted FROM report_categories WHERE report_category_id = ?`,
      )
      .get(id) as { deleted: number | null };

    expect(row.deleted).toBe(NOW);
  });
});

describe("a report line has exactly one identity", () => {
  test("a listing line is keyed by its group, not a portion", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");
    listing(db, "p2", "r1", "g1");

    classifyListing(db, "rl1", "r1", "g1");

    const row = db
      .query(`SELECT record_listing_group_id AS lid, record_extra_id AS eid FROM report_lines`)
      .get() as { lid: string | null; eid: string | null };

    expect(row).toEqual({ lid: "g1", eid: null });
    // The line it classifies is two portion rows — the whole point of the anchor.
    expect(
      db
        .query(`SELECT COUNT(*) AS n FROM record_listings WHERE record_listing_group_id = 'g1'`)
        .get(),
    ).toEqual({ n: 2 });
  });

  test("an extra line is keyed by its own id", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");
    extra(db, "e1", "r1");

    classifyExtra(db, "re1", "r1", "e1");

    const row = db
      .query(`SELECT record_listing_group_id AS lid, record_extra_id AS eid FROM report_lines`)
      .get() as { lid: string | null; eid: string | null };
    expect(row).toEqual({ lid: null, eid: "e1" });
  });

  test("but not both at once", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");
    extra(db, "e1", "r1");

    expect(() =>
      db
        .query(
          `INSERT INTO report_lines (
              report_line_id, record_id, record_listing_group_id, record_extra_id,
              report_category_id, report_line_source_rev, report_line_auto, report_line_at
            ) VALUES ('rl1', 'r1', 'g1', 'e1', ?, ?, 1, ?)`,
        )
        .run(categoryId(db, "jual"), NOW, NOW),
    ).toThrow();
  });

  test("and not neither", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");

    expect(() =>
      db
        .query(
          `INSERT INTO report_lines (
              report_line_id, record_id, record_listing_group_id, record_extra_id,
              report_category_id, report_line_source_rev, report_line_auto, report_line_at
            ) VALUES ('rl1', 'r1', NULL, NULL, ?, ?, 1, ?)`,
        )
        .run(categoryId(db, "jual"), NOW, NOW),
    ).toThrow();
  });

  test("one classification per line — a second one is refused", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");
    extra(db, "e1", "r1");

    classifyListing(db, "rl1", "r1", "g1");
    classifyExtra(db, "re1", "r1", "e1");

    // Re-classifying is an UPDATE, not a second INSERT — this is the constraint
    // that makes the classifier's upsert the only way to write.
    expect(() => classifyListing(db, "rl2", "r1", "g1")).toThrow();
    expect(() => classifyExtra(db, "re2", "r1", "e1", "admin")).toThrow();
  });

  test("many lines coexist, NULLs and all", () => {
    // The reason the two UNIQUE constraints do not collide: in SQLite a NULL is
    // distinct from every other NULL, so `record_extra_id` repeated as NULL on
    // every listing line is not a duplicate.
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");
    listing(db, "p2", "r1", "g2");
    extra(db, "e1", "r1");
    extra(db, "e2", "r1", "Admin");

    classifyListing(db, "rl1", "r1", "g1");
    classifyListing(db, "rl2", "r1", "g2");
    classifyExtra(db, "re1", "r1", "e1");
    classifyExtra(db, "re2", "r1", "e2", "admin");

    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 4 });
  });

  test("a line whose record does not exist is refused", () => {
    // No FK points at `record_listing_group_id`, so `record_id` is the constraint
    // that keeps a classification attached to something real.
    const { db } = makeTestDatabase();

    expect(() => classifyListing(db, "rl1", "ghost", "g1")).toThrow();
  });

  test("an unknown category is refused", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");

    expect(() =>
      db
        .query(
          `INSERT INTO report_lines (
              report_line_id, record_id, record_listing_group_id, record_extra_id,
              report_category_id, report_line_source_rev, report_line_auto, report_line_at
            ) VALUES ('rl1', 'r1', 'g1', NULL, 'GHOST', ?, 1, ?)`,
        )
        .run(NOW, NOW),
    ).toThrow();
  });
});

describe("deleting a record", () => {
  test("takes its classifications with it", () => {
    // A real DELETE (a sync merge, a purge) cascades. A soft delete does not, and
    // that is the point: undeleting a record finds its classifications intact.
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");
    extra(db, "e1", "r1");
    classifyListing(db, "rl1", "r1", "g1");
    classifyExtra(db, "re1", "r1", "e1");

    db.query(`DELETE FROM records WHERE record_id = 'r1'`).run();

    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 0 });
  });

  test("a soft delete leaves them exactly as they were", () => {
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");
    classifyListing(db, "rl1", "r1", "g1", "jual", 0);

    db.query(`UPDATE records SET record_deleted_at = ? WHERE record_id = 'r1'`).run(NOW);

    expect(db.query(`SELECT COUNT(*) AS n FROM report_lines`).get()).toEqual({ n: 1 });
  });
});

describe("report_periods", () => {
  function period(db: Db, id: string, kind: string, start: number): void {
    db.query(
      `INSERT INTO report_periods (
          report_period_id, report_period_kind, report_period_start, report_period_end,
          report_period_created_at, report_period_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, kind, start, start + 86_400_000, NOW, NOW);
  }

  test("defaults to open, with no close time", () => {
    const { db } = makeTestDatabase();
    period(db, "p1", "day", NOW);

    const row = db
      .query(`SELECT report_period_final AS final, report_period_final_at AS at FROM report_periods`)
      .get();
    expect(row).toEqual({ final: 0, at: null });
  });

  test("one row per kind per start", () => {
    const { db } = makeTestDatabase();
    period(db, "p1", "day", NOW);

    expect(() => period(db, "p2", "day", NOW)).toThrow();
    // The same start under a different kind is a different report.
    expect(() => period(db, "p3", "week", NOW)).not.toThrow();
  });

  test("only the five kinds exist", () => {
    const { db } = makeTestDatabase();

    expect(() => period(db, "p0", "fortnight", NOW)).toThrow();
    for (const kind of ["day", "week", "month", "quarter", "year"]) {
      expect(() => period(db, `${kind}1`, kind, NOW)).not.toThrow();
    }
  });
});

describe("STRICT", () => {
  test("refuses a text where a number belongs", () => {
    // STRICT is what stops a `report_line_auto` of `'yes'` from reading as truthy
    // in one query and falsey in another.
    const { db } = makeTestDatabase();
    record(db, "r1");
    listing(db, "p1", "r1", "g1");

    expect(() =>
      db
        .query(
          `INSERT INTO report_lines (
              report_line_id, record_id, record_listing_group_id, record_extra_id,
              report_category_id, report_line_source_rev, report_line_auto, report_line_at
            ) VALUES ('rl1', 'r1', 'g1', NULL, ?, ?, 'yes', ?)`,
        )
        .run(categoryId(db, "jual"), NOW, NOW),
    ).toThrow();
  });
});
