import { Effect, Context, Data, Stream } from "effect";
import type { NotFound } from "~/lib/effect-error";
import type { MethodKind } from "~/lib/constants";

export class RecordError extends Data.TaggedError("RecordError")<{ message: string }> {}

/**
 * Which way money moved — the opposite of which way goods moved. `incoming` is a
 * sale (penjualan: money in, stock consumed); `outcoming` is a purchase
 * (pembelian: money out, stock received). Read stock code against that inversion,
 * not against the names.
 */
export type RecordMode = "incoming" | "outcoming";

/** Aggregates for one mode over a half-open range `[start, end)`. */
export type RecordSummary = {
  mode: RecordMode;
  /** Number of records in range. */
  count: number;
  /** Sum of grand totals (`record_total + record_rounding`) in range. */
  total: number;
};

export type DiscountKind = "number" | "percent" | "pcs";
export type ValueKind = "number" | "percent";

export type Discount = {
  id: string;
  kind: DiscountKind;
  value: number;
  eff: number;
};

/** A line snapshotted at commit time; `listingId` is null once the listing is gone. */
export type RecordListing = {
  id: string;
  listingId: string | null;
  name: string;
  kind: string;
  price: number;
  qty: number;
  capital: number;
  total: number;
  discounts: Discount[];
};

export type RecordExtra = {
  id: string;
  name: string;
  value: number;
  eff: number;
  kind: ValueKind;
};

/** One payment applied to a record; a record may have several (split payment). */
export type RecordMethod = {
  id: string;
  methodId: string;
  pay: number;
  name: string | null;
  kind: MethodKind;
};

/** `subTotal` / `total` / `grandTotal` / `change` are derived from `fix`. */
export type Record = {
  id: string;
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: RecordMode;
  pay: number;
  note: string;
  fix: number;
  customer: { name: string; phone: string };
  subTotal: number;
  total: number;
  grandTotal: number;
  change: number;
  methods: RecordMethod[];
  updatedAt: number;
  syncAt: number | null;
  deletedAt: number | null;
};

export type RecordFull = Record & {
  listings: RecordListing[];
  extras: RecordExtra[];
};

/**
 * One listing line with the date and mode of the record it belongs to — the row
 * shape behind the comprehensive search page.
 */
export type ListingHistoryEntry = {
  /** Parent record. */
  recordId: string;
  paidAt: number;
  mode: RecordMode;
  /** The listing line itself. */
  id: string;
  name: string;
  qty: number;
  price: number;
};

/** A capped page of matches plus the full match count for the same filter. */
export type ListingHistoryPage = {
  entries: ListingHistoryEntry[];
  total: number;
};

export class RecordService extends Context.Tag("RecordService")<
  RecordService,
  {
    get: {
      /**
       * Records paid inside `[start, end)`, newest first. `query` narrows to
       * records carrying a listing whose name matches.
       */
      byRange: (
        start: number,
        end: number,
        query?: string,
      ) => Effect.Effect<Record[], RecordError>;
      byId: (id: string) => Effect.Effect<RecordFull, RecordError | NotFound>;
      /**
       * Listing lines matching a product-name search in `[start, end)` for one
       * mode, newest first, capped at `limit` rows. The count of everything that
       * matched comes back alongside, so the page can show progress without
       * pulling the whole result set.
       *
       * A blank `query` returns nothing rather than every sale in the range.
       */
      listingHistory: (input: {
        start: number;
        end: number;
        mode: RecordMode;
        query: string;
        limit: number;
      }) => Effect.Effect<ListingHistoryPage, RecordError>;
      /** Bumps on every write; a queried page re-reads when it changes. */
      revision: Stream.Stream<number, RecordError>;
    };
    count: {
      summary: (start: number, end: number) => Effect.Effect<RecordSummary[], RecordError>;
    };
    delete: {
      /** Soft-deletes the record and removes the stock movement it caused. */
      byId: (id: string) => Effect.Effect<void, RecordError>;
    };
  }
>() {}
