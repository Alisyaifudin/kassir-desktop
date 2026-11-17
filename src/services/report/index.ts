import { Context, Data, type Effect, type Stream } from "effect";
import type { RecordMode } from "../record";
import type { PeriodKind } from "./period";

export class ReportError extends Data.TaggedError("ReportError")<{ message: string }> {}

/**
 * The six categories `migration-63` seeds. The slug is what the app compares
 * against; the name is what the operator sees and may rename.
 */
export type CategorySlug =
  | "beli"
  | "jual"
  | "diskon"
  | "ppn"
  | "admin"
  | "ongkir"
  /** Not a category of money: the line is deliberately out of the report. */
  | "abaikan";

export type ReportCategory = {
  id: string;
  name: string;
  /** Stable handle. Custom categories get one derived from their name. */
  slug: string;
  /** One of the six above: cannot be removed, and its meaning is fixed. */
  builtin: boolean;
  order: number;
};

/**
 * One line's classification — the only judgement this feature stores.
 *
 * A *listing* line is identified by `record_listing_group_id` (the entered line,
 * shared by every stock-lot portion it was split into), an *extra* line by its own
 * `record_extra_id`. See `migration-63` for why a portion id would be wrong.
 */
export type LineClassification = {
  /** The id the line has in the UI: a group id, or an extra id. */
  lineId: string;
  source: "listing" | "extra";
  categoryId: string;
  /** True when a default filled it in and the operator has not touched it. */
  auto: boolean;
  /**
   * The record's `record_updated_at` at the moment this was decided. Compared to
   * the record's current value: a mismatch means the record moved afterwards, so
   * the classification may no longer describe what it classified.
   */
  sourceRev: number;
};

/**
 * A rail row: one record of the day, with how much of it still needs a human.
 *
 * `grandTotal` is `record_total + record_rounding` at the record's own `fix`, the
 * same figure `/records` and `/analytics` show — not a fresh sum.
 */
export type DayRecord = {
  id: string;
  mode: RecordMode;
  cashier: string;
  /** The effective date: paid, else credit, else created. */
  date: number;
  fix: number;
  grandTotal: number;
  isCredit: boolean;
  /** Lines in scope — listings and extras. */
  lines: number;
  /** Lines with no classification at all. This is what blocks the day. */
  unclassified: number;
  /** Classified lines whose record was edited since. */
  stale: number;
};

export type ReportDay = {
  /** A `report_periods` row exists for the day — someone pressed "Buat laporan". */
  started: boolean;
  records: DayRecord[];
};

/**
 * How much of a day is left. Counted per line, because lines are the unit of work
 * — after the defaults are seeded almost every record already has categories, so
 * a per-record "reviewed" number would open at 149/150 and measure nothing.
 */
export type DayProgress = {
  records: number;
  lines: number;
  unclassified: number;
  stale: number;
};

/** One day of a period report: the `Laporan` view's rail. */
export type PeriodDay = {
  /** Local midnight. */
  day: number;
  records: number;
  lines: number;
  unclassified: number;
  stale: number;
  started: boolean;
};

/**
 * A line the operator chose to leave out of the report (`abaikan`).
 *
 * Reported because a total that quietly skips lines is a total nobody can audit:
 * the paper says which lines it is not counting, by name and by amount.
 */
export type ExcludedLine = {
  name: string;
  /** The record's effective date, so the line can be found on `/records`. */
  at: number;
  mode: RecordMode;
  total: number;
};

/**
 * What the lines' own discounts came to, per direction.
 *
 * A *memo*: it is already subtracted from every category total (a category's
 * money is net), so it must never be added again — it is printed so the report can
 * say how much discount the trade gave away, which otherwise has no answer on the
 * paper. Grouped by direction because a purchase's discount is a different fact
 * from a sale's.
 */
export type DiscountTotal = {
  mode: RecordMode;
  /** How many discounts were entered — not how many lines carry one. */
  entries: number;
  total: number;
};

/** One category's money, per direction — a legal category can appear on both. */
export type CategoryTotal = {
  categoryId: string;
  categoryName: string;
  slug: string;
  order: number;
  mode: RecordMode;
  lines: number;
  total: number;
};

/**
 * The report body, derived on every read.
 *
 * Nothing here is stored: a stored total goes stale the moment a record from the
 * range is edited, a credit settles onto a later date, or a sync merge lands. The
 * only persisted state is the classification, and `unclassified` says how much of
 * the range has none — a report with unclassified lines is provisional, and the
 * screen has to say so.
 */
export type ReportTotals = {
  incoming: number;
  outcoming: number;
  /** `record_total + record_rounding` over the range; prints as "Pembulatan". */
  rounding: number;
  /** One row per (category, direction). Sorted by category order, then direction. */
  categories: CategoryTotal[];
  lines: number;
  unclassified: number;
  stale: number;
  /**
   * Lines marked `abaikan`, with what they would have contributed. Not part of
   * `categories` and not part of `incoming`/`outcoming` — the report prints them
   * as its own section so the figures it *does* show can be audited against what
   * they leave out.
   */
  excluded: ExcludedLine[];
  /** Already deducted from every total above — printed, never added. */
  discounts: DiscountTotal[];
};

/**
 * One line, as the page knows it: the record it belongs to, which kind of line it
 * is, and the id that identifies it in that record.
 *
 * `source` is not redundant with `lineId` — a listing line and an extra line are
 * two different namespaces, and the write targets a different column for each.
 * Passing the wrong pair is a bug the service refuses rather than mis-writes.
 */
export type LineInput = {
  recordId: string;
  source: "listing" | "extra";
  /** `record_listing_group_id` for a listing, `record_extra_id` for an extra. */
  lineId: string;
  categoryId: string;
};

export class ReportService extends Context.Tag("ReportService")<
  ReportService,
  {
    get: {
      /** The category list, built-ins first, soft-deleted ones out. */
      categories: () => Effect.Effect<ReportCategory[], ReportError>;
      /** The day's records in rail order, and whether the day has a report yet. */
      day: (start: number, end: number) => Effect.Effect<ReportDay, ReportError>;
      /** Every classification a record's lines carry. Unclassified lines are absent. */
      lines: (recordId: string) => Effect.Effect<LineClassification[], ReportError>;
      /** What is left to do on a day (§4.3). */
      progress: (start: number, end: number) => Effect.Effect<DayProgress, ReportError>;
      /** One row per day in the range, for the `Laporan` view's rail. */
      days: (start: number, end: number) => Effect.Effect<PeriodDay[], ReportError>;
      /** The derived report body. */
      totals: (start: number, end: number) => Effect.Effect<ReportTotals, ReportError>;
      /** Whether a report exists for this range, i.e. `Buat laporan` was pressed. */
      exists: (kind: string, start: number) => Effect.Effect<boolean, ReportError>;
      /** Bumps on every write; a report page re-reads when it changes. */
      revision: Stream.Stream<number, ReportError>;
    };
    set: {
      /**
       * **Buat laporan**: opens the day and fills in the **goods** lines, in one
       * transaction.
       *
       * Idempotent — a second press seeds only what is missing.
       *
       * What is filled in, and what is deliberately not:
       *
       * - `incoming` listings → **Jual**, `outcoming` → **Beli**. A line of goods
       *   on a sale *is* revenue and on a purchase *is* cost, because the record's
       *   direction says which way the money moved. That is the only thing the app
       *   knows without asking.
       * - **Extras are not filled in at all.** A charge is a free-text string, and
       *   nothing in it says what it means — `Ongkir` is freight today, packaging
       *   tomorrow, and a typo for a product on one record. Guessing, and worse
       *   remembering a guess, would let one careless click become an assumption
       *   that outlives the record it came from. Each extra is a question for the
       *   operator, every time, which is what the classifier is for.
       *
       * So a freshly opened day still has work on it: its extras. That is the
       * intended state, not an incomplete seed.
       */
      startDay: (start: number, end: number) => Effect.Effect<void, ReportError>;
      /** Classify one line. An upsert, and the line stops being `auto`. */
      line: (input: LineInput) => Effect.Effect<void, ReportError>;
      /**
       * **Buat laporan mingguan** (or monthly…): closes a period.
       *
       * Refused while the range has an unclassified or stale line, because a
       * closed period is a claim that the range was read to its end. Stores
       * closure only — never the figures (§3.3).
       */
      close: (
        kind: PeriodKind,
        start: number,
        end: number,
      ) => Effect.Effect<void, ReportError>;
      /** Rename. Also rewrites how past reports print it — see REPORT.md §10.4. */
      category: (id: string, name: string) => Effect.Effect<void, ReportError>;
      /** Reorder: assigns 0..n-1 in the order given. */
      categoryOrder: (ids: string[]) => Effect.Effect<void, ReportError>;
    };
    add: {
      /** A custom category. Returns the new row, so a combobox can select it. */
      category: (name: string) => Effect.Effect<ReportCategory, ReportError>;
    };
    delete: {
      /** Soft-delete. Refused while any report line still names it. */
      category: (id: string) => Effect.Effect<void, ReportError>;
    };
    /**
     * Re-reads every derived view (bumps the `revision` counter). Every read is
     * SQL over these tables, so a sync merge that wrote rows from the server only
     * has to bump it. Sync calls this after the `report` group commits.
     */
    refresh: () => Effect.Effect<void>;
  }
>() {}
