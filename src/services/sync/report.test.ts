/**
 * The report group's client-side merge rule (migration-65).
 *
 * Three things are worth pinning here, because they are the difference between
 * "sync merges the report" and "sync silently discards a cashier's work":
 *
 *   1. `decide` — an explicit classification (`report_line_auto = 0`) outranks
 *      an app-seeded default (`= 1`) before the clock is consulted.
 *   2. the SQL guard enforces the same order, because a local write can land
 *      between the TypeScript decision and the statement that applies it.
 *   3. a record's classification is keyed by the line (`L:<group>`), so two
 *      tills classifying one line write one row rather than violating the
 *      `UNIQUE(record_listing_group_id)` on the second merge.
 *
 * Run with:  bun test src/services/sync/report.test.ts
 */
import { describe, expect, test } from "bun:test";
import { makeTestDatabase } from "../db/test-support";
import { decide } from "./merge";
import { TABLES, toCanonicalRow } from "./schema";
import { forceUpsertStatement, upsertIfNewerStatement } from "./sql";

const AT = 1_762_000_000_000;

type Db = ReturnType<typeof makeTestDatabase>["db"];

/** The minimum rows a classification hangs from. */
function seed(db: Db): void {
  db.query(
    `INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
      ) VALUES ('r1', ?, ?, 0, NULL, 'Ali', 'incoming', 20000, '', 0, '', '', 20000, 20000,
                ?, NULL, NULL, 0, NULL)`,
  ).run(AT, AT, AT);
  // migration-65 seeds the built-ins already; keep this idempotent so a future
  // seed change cannot turn this helper into a UNIQUE failure.
  db.query(
    `INSERT OR IGNORE INTO report_categories (
        report_category_id, report_category_name, report_category_slug,
        report_category_builtin, report_category_order, report_category_updated_at,
        report_category_sync_at, report_category_deleted_at
      ) VALUES ('C:jual', 'Jual', 'jual', 1, 1, 0, NULL, NULL)`,
  ).run();
}

function line(over: Record<string, unknown> = {}) {
  return toCanonicalRow(
    TABLES["report_line"]!,
    {
      report_line_id: "L:g1",
      record_id: "r1",
      record_listing_group_id: "g1",
      record_extra_id: null,
      report_category_id: "C:jual",
      report_line_source_rev: AT,
      report_line_auto: 1,
      report_line_at: AT,
      report_line_deleted_at: null,
      ...over,
    },
  );
}

/** Writes one row through the merge's upsert, in one statement. */
function upsert(db: Db, row: ReturnType<typeof line>, syncAt: number): void {
  const statement = upsertIfNewerStatement(TABLES["report_line"]!, row, syncAt);
  db.query(statement.sql).run(...(statement.bindings as (string | number | null)[]));
}

function stored(db: Db): { category: string; auto: number } {
  return db
    .query(
      `SELECT report_category_id AS category, report_line_auto AS auto
         FROM report_lines WHERE report_line_id = 'L:g1'`,
    )
    .get() as { category: string; auto: number };
}

describe("decide — a human's classification outranks a seeded default", () => {
  const def = TABLES["report_line"]!;

  test("a newer default loses to an older explicit choice", () => {
    expect(decide(def, line({ report_line_auto: 0 }), line({ report_line_auto: 1, report_line_at: AT + 1 }))).toBe(
      "stale",
    );
  });

  test("an older explicit choice beats a newer default", () => {
    expect(decide(def, line({ report_line_auto: 1 }), line({ report_line_auto: 0, report_line_at: AT - 1 }))).toBe(
      "applied",
    );
  });

  test("at the same rank the later clock wins, and a tie keeps the local row", () => {
    expect(decide(def, line({ report_line_at: AT }), line({ report_line_at: AT + 1 }))).toBe("applied");
    expect(decide(def, line({ report_line_at: AT }), line({ report_line_at: AT }))).toBe("noop");
    expect(decide(def, line({ report_line_at: AT }), line({ report_line_at: AT - 1 }))).toBe("stale");
  });
});

describe("the SQL guard repeats the precedence rule", () => {
  test("an explicit row overwrites a newer default", () => {
    const { db } = makeTestDatabase();
    seed(db);
    upsert(db, line({ report_line_auto: 1, report_line_at: AT + 5 }), 1);
    upsert(db, line({ report_line_auto: 0, report_category_id: "C:beli", report_line_at: AT }), 2);
    expect(stored(db)).toEqual({ category: "C:beli", auto: 0 });
  });

  test("a newer default cannot overwrite an explicit row", () => {
    const { db } = makeTestDatabase();
    seed(db);
    upsert(db, line({ report_line_auto: 0, report_category_id: "C:beli", report_line_at: AT }), 1);
    upsert(db, line({ report_line_auto: 1, report_line_at: AT + 5 }), 2);
    expect(stored(db)).toEqual({ category: "C:beli", auto: 0 });
  });

  test("the stale-ack repair writes a more authoritative server row over a newer local default", () => {
    const { db } = makeTestDatabase();
    seed(db);
    upsert(db, line({ report_line_auto: 1, report_line_at: AT + 5 }), 1);
    // The local row was edited after the frame left, so `since` is behind its
    // clock — but the server's explicit row still wins on rank.
    const repair = forceUpsertStatement(
      TABLES["report_line"]!,
      line({ report_line_auto: 0, report_category_id: "C:beli", report_line_at: AT }),
      2,
      AT + 1,
    );
    db.query(repair.sql).run(...(repair.bindings as (string | number | null)[]));
    expect(stored(db)).toEqual({ category: "C:beli", auto: 0 });
  });
});
