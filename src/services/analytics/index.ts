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
 * What a line without a believable cost is worth as margin: `min(total ×
 * percent, raw)`. Both halves matter — a percentage alone turns a lucky big
 * ticket into a margin it never made, and a rupiah alone says nothing about a
 * cheap line — so a line's estimate is the smaller of the two.
 *
 * This is the page's one deliberate estimate (see migration-54: the old app
 * copied the *selling price* into the cost column for a year of sales), which is
 * why the operator can move both numbers.
 */
export type MarginEstimate = {
  /** Percent of the line total, 0–100. */
  percent: number;
  /** Ceiling in rupiah, per line. */
  raw: number;
};

/** Rp5.000 or 10%, whichever is lower: the shop's own rule of thumb. */
export const DEFAULT_MARGIN_ESTIMATE: MarginEstimate = { percent: 10, raw: 5000 };

/**
 * An estimate held inside the range the query assumes: a percent of a line, and
 * a ceiling of at least nothing. Stored and hand-typed values both come through
 * here, so a `-5` in localStorage cannot make the page subtract money it never
 * earned.
 */
export function normalizeMarginEstimate(estimate: Partial<MarginEstimate>): MarginEstimate {
  const percent = Number(estimate.percent);
  const raw = Number(estimate.raw);
  return {
    percent: Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : DEFAULT_MARGIN_ESTIMATE.percent,
    raw: Number.isFinite(raw) ? Math.max(raw, 0) : DEFAULT_MARGIN_ESTIMATE.raw,
  };
}

/**
 * The gross margin of one local day.
 *
 * `margin` comes only from lines that stored a cost worth believing (above zero
 * and below the line's own price); `estimatedMargin` is the same day's `min(total
 * × percent, raw)` over every other line. Both counts ride along, because "how
 * much of this bar was guessed" is a number the page has to be able to print —
 * zero `costed` and zero `estimated` means the day had no sales at all.
 */
export type MarginStat = {
  day: string;
  margin: number;
  costed: number;
  estimatedMargin: number;
  estimated: number;
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
 * Two products that keep turning up in the same record — an edge of the
 * co-occurrence network at `/network`.
 */
export type ProductPair = {
  /** The two `product_id`s, ordered `a < b` so a pair has exactly one row. */
  a: string;
  b: string;
  /** Records holding both — a record is one observation, however many lines. */
  co: number;
  /** Records holding `a`; the first denominator of `lift`. */
  basketsA: number;
  /** Records holding `b`; the second denominator of `lift`. */
  basketsB: number;
  /** `pairLift(co, basketsA, basketsB, records)`, carried so the page never recomputes it. */
  lift: number;
};

/**
 * One period's product network.
 *
 * `records` is the number of records holding at least one catalogued product: the
 * `N` of every lift in `pairs`. It rides along rather than being derived from
 * `pairs`, so a period whose pairs were all filtered away still knows how much
 * evidence it had — what the page needs to say "nothing repeated" instead of
 * "nothing sold".
 */
export type ProductPairs = { records: number; pairs: ProductPair[] };

/**
 * How much more often two products share a record than independence predicts.
 *
 * `1` is no relationship, above `1` is a real pairing, below `1` is two products
 * that avoid each other. It is the only figure on this screen that does not
 * restate popularity: a pair of best sellers scores near `1` no matter how often
 * it repeats, while two mid-volume products that always travel together score
 * high. Counting alone would rank `Indomie × Air` above `Kopi × Gula` in every
 * window simply because both sell every day.
 *
 * Both denominators are guarded: a week with no records, or a product the period
 * never saw, must yield `0` rather than `Infinity` or `NaN` — a canvas scaled by
 * `NaN` draws nothing at all and looks like a broken query.
 */
export function pairLift(co: number, basketsA: number, basketsB: number, records: number): number {
  if (basketsA <= 0 || basketsB <= 0 || records <= 0) return 0;
  return (co * records) / (basketsA * basketsB);
}

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
      /**
       * Per local day: the margin of the lines whose cost can be believed, plus
       * `min(total × estimate.percent, estimate.raw)` for every line whose cost
       * is missing or is really its selling price.
       */
      margins: (
        from: number,
        to: number,
        estimate?: MarginEstimate,
      ) => Effect.Effect<MarginStat[], AnalyticsError>;
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
      /**
       * Every pair of products that shared at least two records in the period.
       *
       * This is the *definition* of the network, and the reference implementation
       * of it: the Rust builder (`src-tauri/src/graph.rs`) aggregates the same
       * rows into the same pairs, and the fixture in `live.test.ts` is what both
       * are held to. No screen calls this — the canvas reads the built snapshot —
       * so it stays the oracle the fast path cannot drift from.
       */
      productPairs: (
        from: number,
        to: number,
        mode: RecordMode,
      ) => Effect.Effect<ProductPairs, AnalyticsError>;
    };
  }
>() {}
