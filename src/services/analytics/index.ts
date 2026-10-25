import { Effect, Context, Data } from "effect";
import type { MethodKind } from "~/lib/constants";
import type { RecordMode } from "../record";

export class AnalyticsError extends Data.TaggedError("AnalyticsError")<{
  message: string;
}> {}

/**
 * One local day of money, split by the direction it moved. `day` is a calendar
 * date in the shop's timezone (`YYYY-MM-DD`), not an instant, because the
 * grouping is by what the clock said.
 */
export type DailyStat = {
  day: string;
  mode: RecordMode;
  count: number;
  total: number;
  /** Total of the records in this bucket that are still unpaid. */
  unpaid: number;
  /** How many of them are still unpaid. */
  creditCount: number;
};

/**
 * The gross margin of one day, from the lines that stored a cost. `costed` is
 * the number of lines behind it — zero means "no cost data", which the page
 * shows as such instead of inventing a margin.
 */
export type MarginStat = {
  day: string;
  margin: number;
  costed: number;
};

/** Sales per local hour of day (0–23) — when the counter is busy. */
export type HourStat = { hour: number; count: number; total: number };

/** Sales per weekday, 1 = Monday … 7 = Sunday (ISO), not SQLite's 0=Sunday. */
export type WeekdayStat = { weekday: number; count: number; total: number };

/** One product in the period, with everything its lines add up to. */
export type ProductGroup = {
  /** `product_id`, or `name:<snapshot>` for a line whose product is gone. */
  key: string;
  name: string;
  /** Null when the catalog row is gone; the line's name snapshot remains. */
  productId: string | null;
  qty: number;
  revenue: number;
  /** Only from lines with a stored cost; compare with `costed` before showing. */
  margin: number;
  costed: number;
  /** How many record lines make up this product in the period. */
  lines: number;
};

/** One `record_listings` line: what was sold/bought, on which record, when. */
export type ProductInstance = {
  recordId: string;
  /** The record's effective date — the same day the record page shows. */
  at: number;
  name: string;
  qty: number;
  /** Pieces per listing unit at the time of the sale. */
  unit: number;
  price: number;
  total: number;
  /** Per listing unit; 0 means the line carried no cost. */
  capital: number;
  kind: string;
  productId: string | null;
};

export type PaymentStat = { kind: MethodKind; total: number; count: number };

/**
 * Read-only aggregates over saved records, for `/analytics`.
 *
 * Every query shares three rules:
 *   * deleted records are out;
 *   * `record_flag` bit 0 (hand-typed adjustments, see FLAGS.md) is out — a
 *     sales figure that included them would be measuring something else;
 *   * a record belongs to the day `COALESCE(paid_at, credit_at, created_at)`
 *     says it does, the same effective date the day list and Beranda use. A
 *     settled credit therefore lands on the day it was paid.
 */
export class AnalyticsService extends Context.Tag("AnalyticsService")<
  AnalyticsService,
  {
    get: {
      /** Per local day, per direction. */
      daily: (from: number, to: number) => Effect.Effect<DailyStat[], AnalyticsError>;
      /** Per local day, only for lines that stored a cost. */
      margins: (from: number, to: number) => Effect.Effect<MarginStat[], AnalyticsError>;
      /** Sales (`incoming` only) per local hour. */
      hours: (from: number, to: number) => Effect.Effect<HourStat[], AnalyticsError>;
      /** Sales per ISO weekday. */
      weekdays: (from: number, to: number) => Effect.Effect<WeekdayStat[], AnalyticsError>;
      /** Every product that moved in the period — no cap, the page paginates. */
      productGroups: (
        from: number,
        to: number,
        mode: RecordMode,
      ) => Effect.Effect<ProductGroup[], AnalyticsError>;
      /** The lines behind one product group, newest first. */
      productInstances: (
        from: number,
        to: number,
        mode: RecordMode,
        key: string,
        limit: number,
      ) => Effect.Effect<ProductInstance[], AnalyticsError>;
      /** What was actually tendered, grouped by method kind. */
      payments: (from: number, to: number) => Effect.Effect<PaymentStat[], AnalyticsError>;
    };
  }
>() {}
