import { Effect, Layer } from "effect";
import { Temporal } from "temporal-polyfill";
import {
  AnalyticsError,
  AnalyticsService,
  DEFAULT_MARGIN_ESTIMATE,
  normalizeMarginEstimate,
  type DailyStat,
  type HourStat,
  type MarginStat,
  type PaymentStat,
  type ProductGroup,
  type ProductInstance,
  type ProductPair,
  type ProductPairs,
  type WeekdayStat,
  pairLift,
} from ".";
import { DatabaseService, type DbError } from "../db";
import { tz, type MethodKind } from "~/lib/constants";
import type { RecordMode } from "../record";
// The scope predicate is a file, not a constant: the Rust graph builder
// (`src-tauri/src/graph.rs`) reads the same one with `include_str!`.
import SCOPE_FILE from "./scope.sql?raw";

/**
 * The effective date of a record — the day it belongs to, as everywhere else.
 *
 * The same expression `scope.sql` carries. It is repeated here because the date
 * bucketing needs it standalone (`date((EFF + offset) / 1000, 'unixepoch')`),
 * and the two are kept in step by hand; change one, change both.
 */
const EFF = "COALESCE(record_paid_at, record_credit_at, record_created_at)";
const EFF_R = "COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at)";

/**
 * `scope.sql`, with its alias substituted and its comments removed.
 *
 * Stripping is not cosmetic. The fragment is spliced in directly after a
 * `WHERE`, so a leading `--` would comment out the clause it belongs to.
 */
function scope(alias: "" | "r."): string {
  return SCOPE_FILE.replace(/--[^\n]*/g, " ")
    .replace(/\{r\}/g, alias)
    .replace(/\s+/g, " ")
    .trim();
}

/** Every query is over the same set — see `scope.sql` for the three rules. */
const SCOPE = scope("r.");
const SCOPE_PLAIN = scope("");

type DailyRow = {
  day: string;
  mode: RecordMode;
  count: number;
  total: number;
  unpaid: number;
  credit_count: number;
};

const dailySql = (offset: number) => `
  SELECT
    date((${EFF} + ${offset}) / 1000, 'unixepoch') AS day,
    record_mode AS mode,
    COUNT(*) AS count,
    COALESCE(SUM(record_total + record_rounding), 0) AS total,
    COALESCE(SUM(CASE WHEN record_paid_at IS NULL THEN record_total + record_rounding ELSE 0 END), 0) AS unpaid,
    SUM(CASE WHEN record_paid_at IS NULL THEN 1 ELSE 0 END) AS credit_count
  FROM records
  WHERE ${SCOPE_PLAIN}
  GROUP BY day, record_mode
  ORDER BY day`;

type MarginRow = {
  day: string;
  margin: number;
  costed: number;
  estimated_margin: number;
  estimated: number;
};

/**
 * A line whose stored cost can be believed: a cost above zero, below what the
 * line sold for. `capital >= price` is the fingerprint of the v1 migration that
 * copied the selling price into the cost column (migration-54 repairs what it
 * can from the purchase side and the page estimates the rest) — reading it as a
 * cost is what made every bar read zero or negative.
 */
const COSTED = "capital > 0 AND capital < price";

/**
 * `$3` is the percent and `$4` the per-line ceiling of the estimate the page
 * carries (see `MarginEstimate`). The `min` is per line, not per day: a day of
 * one large sale and ten small ones must not give the large one a margin capped
 * as if it were the whole day.
 *
 * The CTE is load-bearing, not decoration. `@tauri-apps/plugin-sql` binds `$N` by
 * its number, but `bun:sqlite` (the unit tests) binds an argument list **in the
 * order the placeholders appear in the statement** — so a `$3` written above a
 * `$1` receives the first argument and the period silently matches nothing. The
 * scope is written first, its `$1`/`$2` come first, and the two estimate numbers
 * only appear after it.
 */
const marginsSql = (offset: number) => `
  WITH scoped AS (
    SELECT
      l.record_listing_total AS total,
      l.record_listing_capital AS capital,
      l.record_listing_price AS price,
      l.record_listing_qty AS qty,
      date((${EFF_R} + ${offset}) / 1000, 'unixepoch') AS day
    FROM record_listings l
    JOIN records r ON r.record_id = l.record_id
    WHERE ${SCOPE}
      AND r.record_mode = 'incoming'
  )
  SELECT
    day,
    COALESCE(SUM(CASE WHEN ${COSTED} THEN total - capital * qty ELSE 0 END), 0) AS margin,
    SUM(CASE WHEN ${COSTED} THEN 1 ELSE 0 END) AS costed,
    COALESCE(SUM(CASE WHEN ${COSTED} THEN 0
      ELSE min(total * $3 / 100.0, $4) END), 0) AS estimated_margin,
    SUM(CASE WHEN ${COSTED} THEN 0 ELSE 1 END) AS estimated
  FROM scoped
  GROUP BY day
  ORDER BY day`;

type HourRow = { hour: number; count: number; total: number };

const hoursSql = (offset: number) => `
  SELECT
    CAST(strftime('%H', (${EFF} + ${offset}) / 1000, 'unixepoch') AS INTEGER) AS hour,
    COUNT(*) AS count,
    COALESCE(SUM(record_total + record_rounding), 0) AS total
  FROM records
  WHERE ${SCOPE_PLAIN} AND record_mode = 'incoming'
  GROUP BY hour
  ORDER BY hour`;

type WeekdayRow = { weekday: number; count: number; total: number };

const weekdaysSql = (offset: number) => `
  SELECT
    CAST(strftime('%w', (${EFF} + ${offset}) / 1000, 'unixepoch') AS INTEGER) AS weekday,
    COUNT(*) AS count,
    COALESCE(SUM(record_total + record_rounding), 0) AS total
  FROM records
  WHERE ${SCOPE_PLAIN} AND record_mode = 'incoming'
  GROUP BY weekday
  ORDER BY weekday`;

type ProductGroupRow = {
  key: string;
  name: string;
  product_id: string | null;
  qty: number;
  revenue: number;
  margin: number;
  costed: number;
  lines: number;
};

const GROUPS = `
  SELECT
    COALESCE(l.product_id, 'name:' || l.record_listing_name) AS key,
    MAX(l.record_listing_name) AS name,
    MAX(l.product_id) AS product_id,
    COALESCE(SUM(l.record_listing_qty), 0) AS qty,
    COALESCE(SUM(l.record_listing_total), 0) AS revenue,
    COALESCE(SUM(CASE WHEN l.record_listing_capital > 0
      THEN l.record_listing_total - l.record_listing_capital * l.record_listing_qty
      ELSE 0 END), 0) AS margin,
    SUM(CASE WHEN l.record_listing_capital > 0 THEN 1 ELSE 0 END) AS costed,
    COUNT(*) AS lines
  FROM record_listings l
  JOIN records r ON r.record_id = l.record_id
  WHERE ${SCOPE} AND r.record_mode = $3
  GROUP BY key
  ORDER BY revenue DESC`;

type ProductInstanceRow = {
  record_id: string;
  at: number;
  name: string;
  qty: number;
  unit: number;
  price: number;
  total: number;
  capital: number;
  kind: string;
  product_id: string | null;
};

const INSTANCES = `
  SELECT
    r.record_id,
    ${EFF_R} AS at,
    l.record_listing_name AS name,
    l.record_listing_qty AS qty,
    l.record_listing_unit AS unit,
    l.record_listing_price AS price,
    l.record_listing_total AS total,
    l.record_listing_capital AS capital,
    l.record_listing_kind AS kind,
    l.product_id
  FROM record_listings l
  JOIN records r ON r.record_id = l.record_id
  WHERE ${SCOPE} AND r.record_mode = $3
    AND COALESCE(l.product_id, 'name:' || l.record_listing_name) = $4
  ORDER BY at DESC
  LIMIT $5`;

type ProductPairRow = {
  a: string;
  b: string;
  co: number;
  baskets_a: number;
  baskets_b: number;
};

/**
 * The denominator of every lift in the period: records that hold at least one
 * catalogued product.
 *
 * Counted as its own statement rather than read off the pair rows so an empty
 * network still knows its `N` — "no pair repeated" and "nothing sold" are
 * different sentences on the page, and only this number can tell them apart.
 */
const PAIR_TOTALS = `
  SELECT COUNT(DISTINCT l.record_id) AS n
  FROM record_listings l
  JOIN records r ON r.record_id = l.record_id
  WHERE ${SCOPE} AND r.record_mode = $3 AND l.product_id IS NOT NULL`;

/**
 * Every pair of products that shared at least two records in the period.
 *
 * The subtlety is the grain. `record_listings` holds one row per *lot portion*,
 * so a line split across two lots appears twice in one record; `basket` collapses
 * that to one row per (record, product) before anything is counted, which is what
 * keeps `co` a count of records rather than of stock movements. A pair is stored
 * once (`a < b`), so `co(a,b)` and `co(b,a)` cannot both exist.
 *
 * `HAVING COUNT(*) >= 2` is the noise floor. A pair that met once is a
 * coincidence, and on a real history the once-only pairs are the large majority
 * of the rows — the network is unreadable long before it is unaffordable.
 *
 * `$1`/`$2` belong to the scope predicate, so they must be written before `$3`;
 * see the note on placeholder order above `marginsSql`.
 */
const PAIRS = `
  WITH lines AS (
    SELECT l.record_id, l.product_id
    FROM record_listings l
    JOIN records r ON r.record_id = l.record_id
    WHERE ${SCOPE} AND r.record_mode = $3 AND l.product_id IS NOT NULL
  ),
  basket AS (
    SELECT DISTINCT record_id, product_id FROM lines
  ),
  per_product AS (
    SELECT product_id, COUNT(*) AS baskets FROM basket GROUP BY product_id
  ),
  pairs AS (
    SELECT a.product_id AS a, b.product_id AS b, COUNT(*) AS co
    FROM basket a
    JOIN basket b ON b.record_id = a.record_id AND b.product_id > a.product_id
    GROUP BY a.product_id, b.product_id
    HAVING COUNT(*) >= 2
  )
  SELECT
    p.a,
    p.b,
    p.co,
    pa.baskets AS baskets_a,
    pb.baskets AS baskets_b
  FROM pairs p
  JOIN per_product pa ON pa.product_id = p.a
  JOIN per_product pb ON pb.product_id = p.b
  ORDER BY p.co DESC, p.a, p.b`;

type PaymentRow = { kind: MethodKind; total: number; count: number };

const PAYMENTS = `
  SELECT
    m.method_kind AS kind,
    COALESCE(SUM(rm.record_method_pay), 0) AS total,
    COUNT(*) AS count
  FROM record_methods rm
  JOIN records r ON r.record_id = rm.record_id
  JOIN methods m ON m.method_id = rm.method_id
  WHERE ${SCOPE}
  GROUP BY m.method_kind
  ORDER BY total DESC`;

/**
 * Milliseconds to add to an instant so its UTC date/time reads as the shop's
 * local one. Taken once for the range start: Indonesian zones have no DST, so
 * one offset is exact for the whole range — and it keeps the grouping
 * independent of the process timezone SQLite would otherwise use.
 */
function offsetMs(at: number): number {
  const zoned = Temporal.Instant.fromEpochMilliseconds(at).toZonedDateTimeISO(tz);
  return Math.round(Number(zoned.offsetNanoseconds) / 1_000_000);
}

function failure(error: DbError): AnalyticsError {
  return new AnalyticsError({ message: error.message });
}

export const AnalyticsLive = Layer.effect(
  AnalyticsService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      get: {
        daily(from, to) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<DailyRow>(dailySql(offsetMs(from)), [from, to])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): DailyStat => ({
                day: row.day,
                mode: row.mode,
                count: row.count,
                total: row.total,
                unpaid: row.unpaid,
                creditCount: row.credit_count,
              }),
            );
          });
        },
        margins(from, to, estimate = DEFAULT_MARGIN_ESTIMATE) {
          return Effect.gen(function* () {
            const { percent, raw } = normalizeMarginEstimate(estimate);
            const rows = yield* db
              .selectMany<MarginRow>(marginsSql(offsetMs(from)), [from, to, percent, raw])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): MarginStat => ({
                day: row.day,
                margin: row.margin,
                costed: row.costed,
                estimatedMargin: row.estimated_margin,
                estimated: row.estimated,
              }),
            );
          });
        },
        hours(from, to) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<HourRow>(hoursSql(offsetMs(from)), [from, to])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): HourStat => ({ hour: row.hour, count: row.count, total: row.total }),
            );
          });
        },
        weekdays(from, to) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<WeekdayRow>(weekdaysSql(offsetMs(from)), [from, to])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): WeekdayStat => ({
                // SQLite is 0=Sunday; the page reads Monday-first.
                weekday: ((row.weekday + 6) % 7) + 1,
                count: row.count,
                total: row.total,
              }),
            );
          });
        },
        productGroups(from, to, mode) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<ProductGroupRow>(GROUPS, [from, to, mode])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): ProductGroup => ({
                key: row.key,
                name: row.name,
                productId: row.product_id,
                qty: row.qty,
                revenue: row.revenue,
                margin: row.margin,
                costed: row.costed,
                lines: row.lines,
              }),
            );
          });
        },
        productInstances(from, to, mode, key, limit) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<ProductInstanceRow>(INSTANCES, [
                from,
                to,
                mode,
                key,
                Math.max(1, Math.trunc(limit)),
              ])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): ProductInstance => ({
                recordId: row.record_id,
                at: row.at,
                name: row.name,
                qty: row.qty,
                unit: row.unit,
                price: row.price,
                total: row.total,
                capital: row.capital,
                kind: row.kind,
                productId: row.product_id,
              }),
            );
          });
        },
        productPairs(from, to, mode) {
          return Effect.gen(function* () {
            const total = yield* db
              .selectMany<{ n: number }>(PAIR_TOTALS, [from, to, mode])
              .pipe(Effect.mapError(failure));
            const records = total[0]?.n ?? 0;

            const rows = yield* db
              .selectMany<ProductPairRow>(PAIRS, [from, to, mode])
              .pipe(Effect.mapError(failure));

            const pairs: ProductPairs = {
              records,
              pairs: rows.map(
                (row): ProductPair => ({
                  a: row.a,
                  b: row.b,
                  co: row.co,
                  basketsA: row.baskets_a,
                  basketsB: row.baskets_b,
                  lift: pairLift(row.co, row.baskets_a, row.baskets_b, records),
                }),
              ),
            };
            return pairs;
          });
        },
        payments(from, to) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<PaymentRow>(PAYMENTS, [from, to])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): PaymentStat => ({ kind: row.kind, total: row.total, count: row.count }),
            );
          });
        },
      },
    };
  }),
);
