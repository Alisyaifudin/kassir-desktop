import { Effect, Layer, SubscriptionRef } from "effect";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import {
  ReportError,
  ReportService,
  type CategoryTotal,
  type DayProgress,
  type DayRecord,
  type LineClassification,
  type PeriodDay,
  type ReportCategory,
  type ReportDay,
  type ReportTotals,
  type ExcludedLine,
  type DiscountTotal,
  type LineInput,
} from ".";
import { SCOPE_R } from "../analytics/scope";
import { DatabaseService, type DbError } from "../db";
import type { RecordMode } from "../record";
import { notifySync } from "../sync/trigger";
import type { PeriodKind } from "./period";

// ============================================================================
// The line universe
// ============================================================================
//
// Every aggregate in this file starts from these CTEs, so the day's dots, the
// progress counter and the report body cannot disagree about what a line is or
// what it is worth. `scope.sql` supplies "which records, which day" — the same
// three rules `/analytics` reads.
//
// Two things here are load-bearing:
//
//  * `discounts_by_line` dedupes by `discount_group_id`. A discount is copied onto
//    every lot portion of the line it was typed on, so summing `discount_eff`
//    across a line's portions would subtract it once per portion. `regroupListings`
//    in `record/live.ts` merges the copies the same way, which is what keeps this
//    number equal to the line total the record page shows.
//
//  * a line's money is `price × qty − its discounts` for a listing and
//    `record_extra_eff` for an extra. That is exactly how `record_sub_total` and
//    `record_total` were derived at submit (`linesSubtotal` + `recalcExtras`), so
//    the sum of a record's lines equals its `record_total` — the reconciliation
//    `report/live.test.ts` asserts rather than assumes.

/**
 * The scope's records, with the columns every aggregate needs.
 *
 * `eff` is the effective date — the day the record belongs to, as everywhere else.
 */
const SCOPED = `
  scoped AS (
    SELECT
      r.record_id, r.record_mode, r.record_fix, r.record_cashier,
      r.record_total, r.record_rounding, r.record_paid_at, r.record_credit_at,
      r.record_updated_at,
      COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at) AS eff
    FROM records r
    WHERE ${SCOPE_R}
  )`;

/** One row per *line*, in scope, with its category (NULL when unclassified). */
const LINES = `
  discounts_by_line AS (
    SELECT rl.record_listing_group_id AS line_id, SUM(d.eff) AS eff
    FROM (
      SELECT discount_group_id, MAX(discount_eff) AS eff, MAX(record_listing_id) AS record_listing_id
      FROM discounts
      GROUP BY discount_group_id
    ) d
    JOIN record_listings rl ON rl.record_listing_id = d.record_listing_id
    GROUP BY rl.record_listing_group_id
  ),
  listing_lines AS (
    SELECT
      rl.record_id,
      rl.record_listing_group_id AS line_id,
      'listing'                   AS source,
      -- Every portion of one line carries the same name; MAX is a way of saying
      -- "the line's name" inside a GROUP BY, not a choice between candidates.
      MAX(rl.record_listing_name)  AS name,
      SUM(rl.record_listing_price * rl.record_listing_qty) - COALESCE(MAX(db.eff), 0) AS amount,
      COALESCE(MAX(db.eff), 0)     AS discount,
      MAX(cl.report_category_id)       AS category_id,
      MAX(cl.report_line_source_rev)   AS source_rev
    FROM record_listings rl
    LEFT JOIN discounts_by_line db ON db.line_id = rl.record_listing_group_id
    LEFT JOIN (
      SELECT record_listing_group_id, report_category_id, report_line_source_rev
      FROM report_lines WHERE record_listing_group_id IS NOT NULL
    ) cl ON cl.record_listing_group_id = rl.record_listing_group_id
    WHERE rl.record_id IN (SELECT record_id FROM scoped)
    GROUP BY rl.record_id, rl.record_listing_group_id
  ),
  lines AS (
    SELECT * FROM listing_lines
    UNION ALL
    SELECT
      re.record_id,
      re.record_extra_id AS line_id,
      'extra'            AS source,
      re.record_extra_name AS name,
      re.record_extra_eff  AS amount,
      0                    AS discount,
      cl.report_category_id     AS category_id,
      cl.report_line_source_rev AS source_rev
    FROM record_extras re
    LEFT JOIN (
      SELECT record_extra_id, report_category_id, report_line_source_rev
      FROM report_lines WHERE record_extra_id IS NOT NULL
    ) cl ON cl.record_extra_id = re.record_extra_id
    WHERE re.record_id IN (SELECT record_id FROM scoped)
  )`;

/** Milliseconds to add so an instant's UTC date reads as the shop's local one. */
function offsetMs(at: number): number {
  const zoned = Temporal.Instant.fromEpochMilliseconds(at).toZonedDateTimeISO(tz);
  return Math.round(Number(zoned.offsetNanoseconds) / 1_000_000);
}

/**
 * A `YYYY-MM-DD` bucket back to local midnight.
 *
 * The bucket came from SQL, where it was derived from the range's UTC offset (one
 * offset is exact for the whole range — Indonesian zones have no DST, the same
 * trade `analytics/live.ts` makes). Converting the *calendar date* back here,
 * rather than trusting the offset, is what makes the result an exact local
 * midnight whatever the offset was.
 */
function dayStart(bucket: string): number {
  return Temporal.PlainDate.from(bucket).toZonedDateTime({ timeZone: tz }).epochMilliseconds;
}

function failure(error: DbError): ReportError {
  return new ReportError({ message: error.message });
}

type CategoryRow = {
  report_category_id: string;
  report_category_name: string;
  report_category_slug: string;
  report_category_builtin: number;
  report_category_order: number;
};

const SELECT_CATEGORIES = `
  SELECT report_category_id, report_category_name, report_category_slug,
         report_category_builtin, report_category_order
  FROM report_categories
  WHERE report_category_deleted_at IS NULL
  ORDER BY report_category_order ASC, report_category_name COLLATE NOCASE ASC`;

function rowToCategory(row: CategoryRow): ReportCategory {
  return {
    id: row.report_category_id,
    name: row.report_category_name,
    slug: row.report_category_slug,
    builtin: row.report_category_builtin !== 0,
    order: row.report_category_order,
  };
}

const SELECT_PERIOD = `
  SELECT report_period_final AS final
  FROM report_periods
  WHERE report_period_kind = $1 AND report_period_start = $2`;

type DayRow = {
  record_id: string;
  record_mode: RecordMode;
  record_cashier: string;
  record_fix: number;
  record_total: number;
  record_rounding: number;
  record_paid_at: number | null;
  record_credit_at: number | null;
  eff: number;
  lines: number;
  unclassified: number;
  stale: number;
};

/**
 * The rail, in the order it is walked: effective date, oldest first — the order
 * `/records` shows the same day in.
 *
 * A record with no lines at all still appears (`LEFT JOIN`), because a row that
 * cannot be classified is a fact the screen should show rather than drop. In
 * practice it is an adjustment record, which `scope.sql` already excludes.
 */
const SELECT_DAY = `
  WITH ${SCOPED}, ${LINES}
  SELECT
    sc.record_id, sc.record_mode, sc.record_cashier, sc.record_fix,
    sc.record_total, sc.record_rounding, sc.record_paid_at, sc.record_credit_at,
    sc.eff,
    COUNT(l.line_id) AS lines,
    COALESCE(SUM(CASE WHEN l.line_id IS NOT NULL AND l.category_id IS NULL THEN 1 ELSE 0 END), 0) AS unclassified,
    COALESCE(SUM(CASE WHEN l.category_id IS NOT NULL AND l.source_rev <> sc.record_updated_at THEN 1 ELSE 0 END), 0) AS stale
  FROM scoped sc
  LEFT JOIN lines l ON l.record_id = sc.record_id
  GROUP BY sc.record_id
  ORDER BY sc.eff ASC, sc.record_id ASC`;

const SELECT_PROGRESS = `
  WITH ${SCOPED}, ${LINES}
  SELECT
    (SELECT COUNT(*) FROM scoped) AS records,
    (SELECT COUNT(*) FROM lines) AS lines,
    (SELECT COUNT(*) FROM lines WHERE category_id IS NULL) AS unclassified,
    (SELECT COUNT(*) FROM lines l JOIN scoped sc ON sc.record_id = l.record_id
      WHERE l.category_id IS NOT NULL AND l.source_rev <> sc.record_updated_at) AS stale`;

const SELECT_LINES_OF_RECORD = `
  SELECT record_listing_group_id, record_extra_id, report_category_id,
         report_line_source_rev, report_line_auto
  FROM report_lines
  WHERE record_id = $1
  ORDER BY report_line_at ASC`;

type LineRow = {
  record_listing_group_id: string | null;
  record_extra_id: string | null;
  report_category_id: string;
  report_line_source_rev: number;
  report_line_auto: number;
};

/**
 * One row per day in the range, for the `Laporan` view's rail.
 *
 * Bucketed in SQL because a year is ~50k records; snapped back to a local midnight
 * in `dayStart`. `started` says whether `Buat laporan` was pressed for that day,
 * which is a different question from whether it is complete.
 */
const SELECT_DAYS = (offset: number) => `
  WITH ${SCOPED}, ${LINES},
  per_record AS (
    SELECT
      date((sc.eff + ${offset}) / 1000, 'unixepoch') AS day,
      sc.record_id,
      COUNT(l.line_id) AS lines,
      COALESCE(SUM(CASE WHEN l.line_id IS NOT NULL AND l.category_id IS NULL THEN 1 ELSE 0 END), 0) AS unclassified,
      COALESCE(SUM(CASE WHEN l.category_id IS NOT NULL AND l.source_rev <> sc.record_updated_at THEN 1 ELSE 0 END), 0) AS stale
    FROM scoped sc
    LEFT JOIN lines l ON l.record_id = sc.record_id
    GROUP BY sc.record_id
  )
  SELECT
    p.day,
    COUNT(*) AS records,
    SUM(p.lines) AS lines,
    SUM(p.unclassified) AS unclassified,
    SUM(p.stale) AS stale,
    EXISTS (
      SELECT 1 FROM report_periods rp
      WHERE rp.report_period_kind = 'day'
        AND rp.report_period_start =
            CAST(strftime('%s', p.day || ' 00:00:00') AS INTEGER) * 1000 - ${offset}
    ) AS started
  FROM per_record p
  GROUP BY p.day
  ORDER BY p.day ASC`;

type TotalsRow = {
  category_id: string | null;
  name: string | null;
  slug: string | null;
  ord: number | null;
  mode: RecordMode;
  lines: number;
  total: number;
};

const SELECT_TOTALS = `
  WITH ${SCOPED}, ${LINES}
  SELECT
    l.category_id,
    cat.report_category_name AS name,
    cat.report_category_slug AS slug,
    cat.report_category_order AS ord,
    sc.record_mode AS mode,
    COUNT(*) AS lines,
    SUM(l.amount) AS total
  FROM lines l
  JOIN scoped sc ON sc.record_id = l.record_id
  JOIN report_categories cat ON cat.report_category_id = l.category_id
  -- A line the operator left out contributes to nothing. It is still *classified*
  -- (so the day can complete) — it just is not money this report is about.
  WHERE l.category_id IS NOT NULL AND cat.report_category_slug <> 'abaikan'
  GROUP BY l.category_id, sc.record_mode
  ORDER BY ord ASC, sc.record_mode ASC`;

/**
 * The discounts the lines' own amounts already net out, per direction.
 *
 * Read off the same `lines` CTE, so it is deduped exactly as the amounts are (a
 * discount is copied onto every lot portion of its line) and it skips `abaikan`
 * lines — a discount on a line that is not in the report is not a discount the
 * report gave away.
 */
const SELECT_DISCOUNTS = `
  WITH ${SCOPED}, ${LINES}
  SELECT sc.record_mode AS mode, COUNT(*) AS entries, SUM(l.discount) AS total
  FROM lines l
  JOIN scoped sc ON sc.record_id = l.record_id
  JOIN report_categories cat ON cat.report_category_id = l.category_id
  WHERE cat.report_category_slug <> 'abaikan' AND l.discount > 0
  GROUP BY sc.record_mode`;

/**
 * What the report deliberately leaves out, so its figures can be audited against
 * what they skip. Same shape as one category's rows, one per line.
 */
const SELECT_EXCLUDED = `
  WITH ${SCOPED}, ${LINES}
  SELECT l.name, sc.eff AS at, sc.record_mode AS mode, l.amount AS total
  FROM lines l
  JOIN scoped sc ON sc.record_id = l.record_id
  JOIN report_categories cat ON cat.report_category_id = l.category_id
  WHERE cat.report_category_slug = 'abaikan'
  ORDER BY sc.eff ASC, l.name ASC`;

/**
 * One direction's total, **summed over lines** rather than over records.
 *
 * That is what makes the printed table add up: `incoming` has to equal the sum of
 * the `Masuk` category rows plus the rounding, or the report contradicts itself.
 * Summing `record_total` instead was right while every line counted, and stopped
 * being right when a line could be deliberately left out (`abaikan`) — the record's
 * stored total still contains it.
 *
 * `rounding` stays record-level: it is a per-record adjustment to the grand total,
 * not a property of any line.
 */
const SELECT_MODE_TOTALS = `
  WITH ${SCOPED}, ${LINES},
  money_lines AS (
    SELECT sc.record_mode AS mode, l.amount AS amount
    FROM lines l
    JOIN scoped sc ON sc.record_id = l.record_id
    JOIN report_categories cat ON cat.report_category_id = l.category_id
    WHERE cat.report_category_slug <> 'abaikan'
  )
  SELECT
    sc.record_mode AS mode,
    COALESCE((SELECT SUM(ml.amount) FROM money_lines ml WHERE ml.mode = sc.record_mode), 0) AS total,
    COALESCE(SUM(sc.record_rounding), 0) AS rounding
  FROM scoped sc
  GROUP BY sc.record_mode`;

// ============================================================================
// Writes
// ============================================================================
//
// Three things every statement below has in common:
//
//  * `report_line_source_rev` is always the record's *current* `record_updated_at`,
//    never the clock. That is what makes "this record changed after you classified
//    it" a comparison rather than a guess.
//  * a classification is an upsert on the line's own identity, because there is
//    exactly one row per line (`migration-63`) — re-classifying is never a second
//    insert, and the UI's auto-save needs no client-side "is it new" state.
//  * every id is derived, not minted: the line, the category and the period each
//    have a cross-device identity (migration-65), so two tills write the same
//    primary key for the same thing and ordinary last-writer-wins can decide.

/**
 * "Now", in SQL.
 *
 * The seed statements below cannot take a bound timestamp: `bun:sqlite` binds
 * arguments by **the position they appear in the statement, not by their number**
 * (the note at the top of `analytics/scope.sql`), and a `$3` in the select list
 * would then sit textually *before* the scope's `$1`/`$2` in the `WHERE` and take
 * their values. Every argument would be off by two and the statements would
 * silently match nothing. So the decision time is computed where it is used, at
 * second precision — it is bookkeeping, not money.
 */
const NOW_MS = "CAST(strftime('%s', 'now') AS INTEGER) * 1000";

/**
 * Open the day. `OR IGNORE` is the idempotency: the unique keys are the day and
 * the line, so a second press writes nothing.
 */
const START_DAY = `
  INSERT OR IGNORE INTO report_periods (
    report_period_id, report_period_kind, report_period_start, report_period_end,
    report_period_final, report_period_final_at,
    report_period_created_at, report_period_updated_at, report_period_sync_at
  ) VALUES ('P:day:' || $1, 'day', $1, $2, 0, NULL, $3, $3, NULL)`;

/**
 * Every **goods** line of the day gets the default its direction implies.
 *
 * This is the whole of what the app is willing to fill in. See the note below on
 * why charges are left alone.
 *
 * `GROUP BY record_listing_group_id` is what makes one row per *entered line*
 * rather than one per stock lot. The bare `r.record_id` / `r.record_updated_at`
 * in the select list are safe: both are constant within a group.
 *
 * A line already classified is skipped by the UNIQUE on the group id, so this is
 * safe to re-run after new records land on the day.
 */
const SEED_LISTING_LINES = `
  INSERT OR IGNORE INTO report_lines (
    report_line_id, record_id, record_listing_group_id, record_extra_id,
    report_category_id, report_line_source_rev, report_line_auto, report_line_at
  )
  SELECT
    'L:' || rl.record_listing_group_id,
    r.record_id,
    rl.record_listing_group_id,
    NULL,
    (SELECT report_category_id FROM report_categories
      WHERE report_category_slug =
        CASE WHEN r.record_mode = 'incoming' THEN 'jual' ELSE 'beli' END),
    r.record_updated_at,
    1,
    ${NOW_MS}
  FROM record_listings rl
  JOIN records r ON r.record_id = rl.record_id
  WHERE ${SCOPE_R}
  GROUP BY rl.record_listing_group_id`;

// There is deliberately no general `SEED_EXTRA_LINES`.
//
// A charge is a free-text string. Nothing in `record_extras` says what "Ongkir"
// means: today it is freight, tomorrow it is packaging, and on one record it was a
// typo for a product. So the app does not guess a charge, and — this is the part
// that was tried and removed — it does not remember one either. Every extra is a
// question, per line, per record. Recording an answer would turn one careless click
// into an assumption that outlives the record it came from.
//
// There is exactly one exception, below: a `dual` charge. That is not a guess about
// a name, it is a fact about the row.
//
// Listings are different: a line of goods on a sale *is* revenue and on a purchase
// *is* cost, because the record's direction says which way the money went. That is
// the only thing that may be filled in "for the operator" by inference.

/**
 * A `dual` charge's line is `abaikan` — excluded, not guessed.
 *
 * `DUAL_FLAG` (`FLAGS.md`) says the charge books twice: the sale carries it *and*
 * commits an extras-only `outcoming` twin for the same money. `scope.sql` keeps
 * that twin out, so counting the sale's own line would count one charge once while
 * the shop both earned and spent it — the net is what it wants, and excluding the
 * line is how the net is reached. Nothing here reads the line's *name*: the flag is
 * a fact about the row, which is the one thing the app may act on without asking.
 *
 * `report_line_auto = 1`, so the cell renders it as a filled-in guess the operator
 * can still override. It is a defensible default, not a decision that hides.
 */
const SEED_DUAL_LINES = `
  INSERT OR IGNORE INTO report_lines (
    report_line_id, record_id, record_listing_group_id, record_extra_id,
    report_category_id, report_line_source_rev, report_line_auto, report_line_at
  )
  SELECT
    'X:' || re.record_extra_id,
    r.record_id,
    NULL,
    re.record_extra_id,
    (SELECT report_category_id FROM report_categories WHERE report_category_slug = 'abaikan'),
    r.record_updated_at,
    1,
    ${NOW_MS}
  FROM record_extras re
  JOIN records r ON r.record_id = re.record_id
  WHERE ${SCOPE_R}
    AND (re.record_extra_flag & 1) <> 0`;

/**
 * One line's category.
 *
 * `INSERT … SELECT` from the line's own row, so a `lineId` that does not belong to
 * `recordId` inserts nothing and the caller is told rather than silently writing a
 * classification against the wrong record.
 */
const UPSERT_LISTING_LINE = `
  INSERT INTO report_lines (
    report_line_id, record_id, record_listing_group_id, record_extra_id,
    report_category_id, report_line_source_rev, report_line_auto, report_line_at,
    report_line_sync_at
  )
  SELECT 'L:' || rl.record_listing_group_id, r.record_id, rl.record_listing_group_id, NULL,
         $1, r.record_updated_at, 0, $2, NULL
  FROM record_listings rl
  JOIN records r ON r.record_id = rl.record_id
  WHERE rl.record_listing_group_id = $3 AND rl.record_id = $4
  LIMIT 1
  ON CONFLICT (record_listing_group_id) DO UPDATE SET
    report_category_id     = excluded.report_category_id,
    report_line_source_rev = excluded.report_line_source_rev,
    report_line_auto       = 0,
    report_line_at         = excluded.report_line_at,
    report_line_sync_at    = NULL`;

const UPSERT_EXTRA_LINE = `
  INSERT INTO report_lines (
    report_line_id, record_id, record_listing_group_id, record_extra_id,
    report_category_id, report_line_source_rev, report_line_auto, report_line_at,
    report_line_sync_at
  )
  SELECT 'X:' || re.record_extra_id, r.record_id, NULL, re.record_extra_id,
         $1, r.record_updated_at, 0, $2, NULL
  FROM record_extras re
  JOIN records r ON r.record_id = re.record_id
  WHERE re.record_extra_id = $3 AND re.record_id = $4
  LIMIT 1
  ON CONFLICT (record_extra_id) DO UPDATE SET
    report_category_id     = excluded.report_category_id,
    report_line_source_rev = excluded.report_line_source_rev,
    report_line_auto       = 0,
    report_line_at         = excluded.report_line_at,
    report_line_sync_at    = NULL`;

const SELECT_LIVE_CATEGORY = `
  SELECT report_category_id FROM report_categories
  WHERE report_category_id = $1 AND report_category_deleted_at IS NULL`;

const SELECT_LISTING_LINE_OWNER = `
  SELECT record_listing_group_id AS id FROM record_listings
  WHERE record_listing_group_id = $1 AND record_id = $2 LIMIT 1`;

const SELECT_EXTRA_LINE_OWNER = `
  SELECT record_extra_id AS id FROM record_extras
  WHERE record_extra_id = $1 AND record_id = $2 LIMIT 1`;

const CLOSE_PERIOD = `
  INSERT INTO report_periods (
    report_period_id, report_period_kind, report_period_start, report_period_end,
    report_period_final, report_period_final_at,
    report_period_created_at, report_period_updated_at, report_period_sync_at
  ) VALUES ('P:' || $1 || ':' || $2, $1, $2, $3, 1, $4, $4, $4, NULL)
  ON CONFLICT (report_period_kind, report_period_start) DO UPDATE SET
    report_period_end       = excluded.report_period_end,
    report_period_final     = 1,
    report_period_final_at  = excluded.report_period_final_at,
    report_period_updated_at = excluded.report_period_updated_at,
    report_period_sync_at   = NULL`;

const INSERT_CATEGORY = `
  INSERT INTO report_categories (
    report_category_id, report_category_name, report_category_slug,
    report_category_builtin, report_category_order,
    report_category_updated_at, report_category_sync_at, report_category_deleted_at
  ) VALUES ('C:' || $1, $2, $1, 0, $3, $4, NULL, NULL)`;

const SELECT_SLUGS_LIKE = `
  SELECT report_category_slug AS slug FROM report_categories WHERE report_category_slug = $1`;

const SELECT_MAX_ORDER = `SELECT COALESCE(MAX(report_category_order), -1) AS ord FROM report_categories`;

const COUNT_NAME = `
  SELECT COUNT(*) AS n FROM report_categories
  WHERE report_category_deleted_at IS NULL AND lower(report_category_name) = lower($1)`;

const COUNT_NAME_OTHER = `
  SELECT COUNT(*) AS n FROM report_categories
  WHERE report_category_deleted_at IS NULL
    AND lower(report_category_name) = lower($1) AND report_category_id <> $2`;

const UPDATE_CATEGORY_NAME = `
  UPDATE report_categories SET
    report_category_name = $1,
    report_category_updated_at = max($2, report_category_updated_at + 1),
    report_category_sync_at = NULL
  WHERE report_category_id = $3`;

const UPDATE_CATEGORY_ORDER = `
  UPDATE report_categories SET
    report_category_order = $1,
    report_category_updated_at = max($2, report_category_updated_at + 1),
    report_category_sync_at = NULL
  WHERE report_category_id = $3`;

const COUNT_LINES_FOR_CATEGORY = `
  SELECT COUNT(*) AS n FROM report_lines WHERE report_category_id = $1`;

const SOFT_DELETE_CATEGORY = `
  UPDATE report_categories SET
    report_category_deleted_at = max($1, report_category_updated_at + 1),
    report_category_updated_at = max($1, report_category_updated_at + 1),
    report_category_sync_at = NULL
  WHERE report_category_id = $2 AND report_category_deleted_at IS NULL`;

const SELECT_CATEGORY_BY_ID = `
  SELECT report_category_id, report_category_name, report_category_slug,
         report_category_builtin, report_category_order
  FROM report_categories
  WHERE report_category_id = $1 AND report_category_deleted_at IS NULL`;

export const ReportLive = Layer.effect(
  ReportService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Bumped after every write so a report page re-reads. Seeded at 0 so a page
    // has a stable key before the first write. The read side never bumps it —
    // a record edit already bumps the record service's revision, and the page
    // watches both.
    const revisionRef = yield* SubscriptionRef.make<number>(0);

    function categories(): Effect.Effect<ReportCategory[], ReportError> {
      return db
        .selectMany<CategoryRow>(SELECT_CATEGORIES)
        .pipe(Effect.mapError(failure), Effect.map((rows) => rows.map(rowToCategory)));
    }

    function exists(kind: string, start: number): Effect.Effect<boolean, ReportError> {
      return db
        .selectMany<{ final: number }>(SELECT_PERIOD, [kind, start])
        .pipe(Effect.mapError(failure), Effect.map((rows) => rows.length > 0));
    }

    function day(start: number, end: number): Effect.Effect<ReportDay, ReportError> {
      return Effect.gen(function* () {
        const [rows, started] = yield* Effect.all([
          db.selectMany<DayRow>(SELECT_DAY, [start, end]).pipe(Effect.mapError(failure)),
          exists("day", start),
        ]);

        const records = rows.map((row): DayRecord => ({
          id: row.record_id,
          mode: row.record_mode,
          cashier: row.record_cashier,
          date: row.eff,
          fix: row.record_fix,
          // The figure `/records` and `/analytics` show, at the record's own fix.
          grandTotal: row.record_total + row.record_rounding,
          isCredit: row.record_paid_at === null && row.record_credit_at !== null,
          lines: row.lines,
          unclassified: row.unclassified,
          stale: row.stale,
        }));

        return { started, records };
      });
    }

    function lines(recordId: string): Effect.Effect<LineClassification[], ReportError> {
      return db.selectMany<LineRow>(SELECT_LINES_OF_RECORD, [recordId]).pipe(
        Effect.mapError(failure),
        Effect.map((rows) =>
          rows.map((row): LineClassification => {
            const listing = row.record_listing_group_id;
            return {
              lineId: listing ?? row.record_extra_id ?? "",
              source: listing === null ? "extra" : "listing",
              categoryId: row.report_category_id,
              auto: row.report_line_auto !== 0,
              sourceRev: row.report_line_source_rev,
            };
          }),
        ),
      );
    }

    function progress(start: number, end: number): Effect.Effect<DayProgress, ReportError> {
      return db.selectMany<DayProgress>(SELECT_PROGRESS, [start, end]).pipe(
        Effect.mapError(failure),
        Effect.map((rows) => rows[0] ?? { records: 0, lines: 0, unclassified: 0, stale: 0 }),
      );
    }

    function days(start: number, end: number): Effect.Effect<PeriodDay[], ReportError> {
      return db
        .selectMany<{
          day: string;
          records: number;
          lines: number;
          unclassified: number;
          stale: number;
          started: number;
        }>(SELECT_DAYS(offsetMs(start)), [start, end])
        .pipe(
          Effect.mapError(failure),
          Effect.map((rows) =>
            rows.map(
              // `EXISTS` comes back as 0/1; the domain type is a boolean.
              (row): PeriodDay => ({
                ...row,
                started: row.started !== 0,
                day: dayStart(row.day),
              }),
            ),
          ),
        );
    }

    function totals(start: number, end: number): Effect.Effect<ReportTotals, ReportError> {
      return Effect.gen(function* () {
        const [byCategory, byMode, excluded, discounts, left] = yield* Effect.all([
          db.selectMany<TotalsRow>(SELECT_TOTALS, [start, end]).pipe(Effect.mapError(failure)),
          db
            .selectMany<{ mode: RecordMode; total: number; rounding: number }>(
              SELECT_MODE_TOTALS,
              [start, end],
            )
            .pipe(Effect.mapError(failure)),
          db
            .selectMany<ExcludedLine>(SELECT_EXCLUDED, [start, end])
            .pipe(Effect.mapError(failure)),
          db
            .selectMany<DiscountTotal>(SELECT_DISCOUNTS, [start, end])
            .pipe(Effect.mapError(failure)),
          progress(start, end),
        ]);

        // A direction's grand total: its lines, plus the rounding that was handed
        // back on its records. That is the figure the operator saw at the till and
        // the figure the table above it adds up to.
        const modeTotal = (mode: RecordMode) => {
          const row = byMode.find((candidate) => candidate.mode === mode);
          return (row?.total ?? 0) + (row?.rounding ?? 0);
        };

        const categories = byCategory.map((row): CategoryTotal => ({
          categoryId: row.category_id ?? "",
          categoryName: row.name ?? "",
          slug: row.slug ?? "",
          order: row.ord ?? 0,
          mode: row.mode,
          lines: row.lines,
          total: row.total,
        }));

        return {
          incoming: modeTotal("incoming"),
          outcoming: modeTotal("outcoming"),
          rounding: byMode.reduce((sum, row) => sum + row.rounding, 0),
          categories,
          lines: left.lines,
          unclassified: left.unclassified,
          stale: left.stale,
          excluded,
          discounts,
        };
      });
    }

    /**
     * Every write bumps the counter, so an open report page re-reads, and tells the
     * sync scheduler a `report` row is now dirty. The announcement is best effort
     * (`notifySync` swallows a missing or failing bus); a committed write is never
     * turned into a failed one because nobody was listening.
     */
    function bump<A>(effect: Effect.Effect<A, ReportError>): Effect.Effect<A, ReportError> {
      return effect.pipe(
        Effect.tap(() => SubscriptionRef.update(revisionRef, (current) => current + 1)),
        Effect.tap(() => notifySync("report")),
      );
    }

    function mustFindCategory(id: string): Effect.Effect<void, ReportError> {
      return db.selectMany<{ report_category_id: string }>(SELECT_LIVE_CATEGORY, [id]).pipe(
        Effect.mapError(failure),
        Effect.flatMap((rows) =>
          rows.length === 0
            ? Effect.fail(new ReportError({ message: "Kategori tidak ditemukan." }))
            : Effect.void,
        ),
      );
    }

    function startDay(start: number, end: number): Effect.Effect<void, ReportError> {
      const now = Date.now();
      return bump(
        db
          .transaction([
            {
              sql: START_DAY,
              bindings: [start, end, now],
            },
            // Only the scope's own `$1`/`$2` — see `NOW_MS` for why a third
            // placeholder cannot go here.
            { sql: SEED_LISTING_LINES, bindings: [start, end] },
            // The one extra that is filled in: a `dual` charge is excluded by
            // default. See `SEED_DUAL_LINES`.
            { sql: SEED_DUAL_LINES, bindings: [start, end] },
          ])
          .pipe(Effect.mapError(failure)),
      );
    }

    function line(input: LineInput): Effect.Effect<void, ReportError> {
      const now = Date.now();
      const isListing = input.source === "listing";
      return bump(
        Effect.gen(function* () {
          yield* mustFindCategory(input.categoryId);

          // A `lineId` that does not belong to `recordId` writes nothing, and the
          // upsert would then be a silent no-op — so the ownership is checked
          // first, where the message can say which of the two is wrong.
          const owner = yield* db
            .selectMany<{ id: string }>(
              isListing ? SELECT_LISTING_LINE_OWNER : SELECT_EXTRA_LINE_OWNER,
              [input.lineId, input.recordId],
            )
            .pipe(Effect.mapError(failure));
          if (owner.length === 0) {
            return yield* Effect.fail(
              new ReportError({ message: "Baris itu bukan milik rekaman tersebut." }),
            );
          }

          yield* db
            .execute(isListing ? UPSERT_LISTING_LINE : UPSERT_EXTRA_LINE, [
              input.categoryId,
              now,
              input.lineId,
              input.recordId,
            ])
            .pipe(Effect.mapError(failure));
        }),
      );
    }

    function close(kind: PeriodKind, start: number, end: number): Effect.Effect<void, ReportError> {
      return bump(
        Effect.gen(function* () {
          const left = yield* progress(start, end);

          // A closed period is a claim that the range was read to its end. Both
          // halves are refused, and each says what is wrong: an unclassified line
          // is work not done, a stale one is work that no longer matches.
          if (left.unclassified > 0) {
            return yield* Effect.fail(
              new ReportError({
                message: `Masih ada ${left.unclassified} baris yang belum diklasifikasi.`,
              }),
            );
          }
          if (left.stale > 0) {
            return yield* Effect.fail(
              new ReportError({
                message: `Ada ${left.stale} baris yang rekamannya berubah setelah diklasifikasi.`,
              }),
            );
          }

          yield* db
            .execute(CLOSE_PERIOD, [kind, start, end, Date.now()])
            .pipe(Effect.mapError(failure));
        }),
      );
    }

    /** `Penyesuaian` → `penyesuaian`; empty or symbol-only falls back to `kategori`. */
    function slugOf(name: string): string {
      const slug = name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return slug === "" ? "kategori" : slug;
    }

    function addCategory(name: string): Effect.Effect<ReportCategory, ReportError> {
      const trimmed = name.trim();
      if (trimmed === "") {
        return Effect.fail(new ReportError({ message: "Nama kategori harus diisi." }));
      }

      return bump(
        Effect.gen(function* () {
          // A name is what the pickers show, so two categories reading the same is
          // a mistake the operator can still make — say so in their words rather
          // than passing on the UNIQUE constraint's.
          const [taken] = yield* db
            .selectMany<{ n: number }>(COUNT_NAME, [trimmed])
            .pipe(Effect.mapError(failure));
          if ((taken?.n ?? 0) > 0) {
            return yield* Effect.fail(
              new ReportError({ message: "Nama kategori itu sudah ada." }),
            );
          }

          // The slug is a stable handle, so it may not collide. The name is
          // already UNIQUE; a name that merely *slugs* to a taken one gets the
          // next free suffix instead of being refused.
          const base = slugOf(trimmed);
          let slug = base;
          for (let suffix = 2; ; suffix += 1) {
            const taken = yield* db
              .selectMany<{ slug: string }>(SELECT_SLUGS_LIKE, [slug])
              .pipe(Effect.mapError(failure));
            if (taken.length === 0) break;
            slug = `${base}-${suffix}`;
          }

          const [top] = yield* db
            .selectMany<{ ord: number }>(SELECT_MAX_ORDER)
            .pipe(Effect.mapError(failure));

          const category: ReportCategory = {
            // The slug is the cross-device identity (migration-65), so the id is
            // derived from it rather than minted: two tills naming a category the
            // same way produce one row, not a UNIQUE failure.
            id: `C:${slug}`,
            name: trimmed,
            slug,
            builtin: false,
            order: (top?.ord ?? -1) + 1,
          };

          yield* db
            .execute(INSERT_CATEGORY, [category.slug, category.name, category.order, Date.now()])
            .pipe(Effect.mapError(failure));

          return category;
        }),
      );
    }

    function renameCategory(id: string, name: string): Effect.Effect<void, ReportError> {
      const trimmed = name.trim();
      if (trimmed === "") {
        return Effect.fail(new ReportError({ message: "Nama kategori harus diisi." }));
      }
      return bump(
        Effect.gen(function* () {
          const [taken] = yield* db
            .selectMany<{ n: number }>(COUNT_NAME_OTHER, [trimmed, id])
            .pipe(Effect.mapError(failure));
          if ((taken?.n ?? 0) > 0) {
            return yield* Effect.fail(
              new ReportError({ message: "Nama kategori itu sudah ada." }),
            );
          }
          yield* db
            .execute(UPDATE_CATEGORY_NAME, [trimmed, Date.now(), id])
            .pipe(Effect.mapError(failure));
        }),
      );
    }

    function orderCategories(ids: string[]): Effect.Effect<void, ReportError> {
      return bump(
        db
          .transaction(
            ids.map((id, index) => ({
              sql: UPDATE_CATEGORY_ORDER,
              bindings: [index, Date.now(), id],
            })),
          )
          .pipe(Effect.mapError(failure)),
      );
    }

    function removeCategory(id: string): Effect.Effect<void, ReportError> {
      return bump(
        Effect.gen(function* () {
          const [builtin] = yield* db
            .selectMany<{ report_category_builtin: number; report_category_slug: string }>(
              SELECT_CATEGORY_BY_ID,
              [id],
            )
            .pipe(Effect.mapError(failure));
          if (builtin === undefined) {
            return yield* Effect.fail(new ReportError({ message: "Kategori tidak ditemukan." }));
          }
          // The six built-ins are the vocabulary this service itself reads: the
          // seed asks for `jual`/`beli` by slug, and `abaikan` is what keeps an
          // excluded line out of the totals. Deleting one would not break loudly —
          // the seed would write NULL into a NOT NULL column and the statement
          // would be skipped — so it is refused here instead.
          if (builtin.report_category_builtin !== 0) {
            return yield* Effect.fail(
              new ReportError({
                message: "Kategori bawaan tidak bisa dihapus. Tambahkan kategori baru bila perlu.",
              }),
            );
          }

          const [used] = yield* db
            .selectMany<{ n: number }>(COUNT_LINES_FOR_CATEGORY, [id])
            .pipe(Effect.mapError(failure));

          // Soft delete, and only once nothing points at it: a past report has to
          // keep being able to name the category it used.
          if ((used?.n ?? 0) > 0) {
            return yield* Effect.fail(
              new ReportError({
                message: `Kategori ini dipakai ${used?.n} baris laporan, jadi belum bisa dihapus.`,
              }),
            );
          }

          yield* db.execute(SOFT_DELETE_CATEGORY, [Date.now(), id]).pipe(Effect.mapError(failure));
        }),
      );
    }

    /**
     * Re-reads everything an open report page derives from these tables. The
     * service holds no row cache — every read is SQL — so a merge that wrote rows
     * from the server only has to bump the revision counter. Sync calls this after
     * the `report` group commits.
     */
    function refresh(): Effect.Effect<void> {
      return SubscriptionRef.update(revisionRef, (current) => current + 1);
    }

    return {
      get: {
        categories,
        day,
        lines,
        progress,
        days,
        totals,
        exists,
        revision: revisionRef.changes,
      },
      set: {
        startDay,
        line,
        close,
        category: renameCategory,
        categoryOrder: orderCategories,
      },
      add: { category: addCategory },
      delete: { category: removeCategory },
      refresh,
    };
  }),
);
