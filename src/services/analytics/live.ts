import { Effect, Layer } from "effect";
import { Temporal } from "temporal-polyfill";
import {
  AnalyticsError,
  AnalyticsService,
  type DailyStat,
  type HourStat,
  type MarginStat,
  type PaymentStat,
  type ProductGroup,
  type ProductInstance,
  type WeekdayStat,
} from ".";
import { DatabaseService, type DbError } from "../db";
import { tz, type MethodKind } from "~/lib/constants";
import type { RecordMode } from "../record";

/** The effective date of a record — the day it belongs to, as everywhere else. */
const EFF = "COALESCE(record_paid_at, record_credit_at, record_created_at)";
const EFF_R = "COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at)";

/**
 * Every query is over the same set: live records, no hand-typed adjustments (see
 * FLAGS.md), inside `[from, to)` on the effective date.
 */
const SCOPE = `r.record_deleted_at IS NULL AND (r.record_flag & 1) = 0 AND ${EFF_R} >= $1 AND ${EFF_R} < $2`;
const SCOPE_PLAIN = `record_deleted_at IS NULL AND (record_flag & 1) = 0 AND ${EFF} >= $1 AND ${EFF} < $2`;

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

type MarginRow = { day: string; margin: number; costed: number };

const marginsSql = (offset: number) => `
  SELECT
    date((${EFF_R} + ${offset}) / 1000, 'unixepoch') AS day,
    COALESCE(SUM(l.record_listing_total - l.record_listing_capital * l.record_listing_qty), 0) AS margin,
    COUNT(*) AS costed
  FROM record_listings l
  JOIN records r ON r.record_id = l.record_id
  WHERE ${SCOPE}
    AND r.record_mode = 'incoming'
    AND l.record_listing_capital > 0
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
        margins(from, to) {
          return Effect.gen(function* () {
            const rows = yield* db
              .selectMany<MarginRow>(marginsSql(offsetMs(from)), [from, to])
              .pipe(Effect.mapError(failure));
            return rows.map(
              (row): MarginStat => ({ day: row.day, margin: row.margin, costed: row.costed }),
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
