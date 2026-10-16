import { Effect, Context, Data, Stream } from "effect";
import type { NotFound } from "~/lib/effect-error";
import type { MethodKind, ValueKind } from "~/lib/constants";

export type { ValueKind };

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
  /** The product behind the listing, when the line still points at one. */
  productId: string | null;
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
 * An unsettled credit record. `payCredit` clears `is_credit`, so a record is
 * outstanding exactly while that flag is set; `total` is what is owed.
 */
export type DebtRecord = {
  id: string;
  paidAt: number;
  note: string;
  /** Decimal places `total` is rendered with. */
  fix: number;
  total: number;
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

/**
 * A record as the import file carries it: the full record with no ids of its
 * own. Listings link to the catalog by `listingId`, which is null when the
 * listing is gone (or was never catalogued), and such a line moves no stock.
 */
export type RecordImport = {
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
  methods: { methodId: string; pay: number }[];
  listings: {
    listingId: string | null;
    name: string;
    kind: string;
    price: number;
    qty: number;
    capital: number;
    total: number;
    discounts: { kind: DiscountKind; value: number; eff: number }[];
  }[];
  extras: { name: string; value: number; eff: number; kind: ValueKind }[];
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
      /** Unsettled credit records, newest first — the /debt table. */
      debt: () => Effect.Effect<DebtRecord[], RecordError>;
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
    add: {
      /**
       * Writes a record that was made elsewhere, under a new id. A sale takes its
       * stock FIFO and a purchase arrives as a cost lot, exactly as a live record
       * would. Fails, writing nothing, when a sale's stock cannot cover a line.
       */
      external: (input: RecordImport) => Effect.Effect<void, RecordError>;
    };
    count: {
      summary: (start: number, end: number) => Effect.Effect<RecordSummary[], RecordError>;
    };
    /**
     * Every write bumps the revision, so a queried page re-reads without being
     * told to. `mode` and `delete` also move stock, which the product
     * aggregate is then asked to re-read.
     */
    set: {
      paidAt: (id: string, paidAt: number) => Effect.Effect<void, RecordError>;
      note: (id: string, note: string) => Effect.Effect<void, RecordError>;
      /**
       * Flips the record between a sale and a purchase, moving stock with it:
       * the movement the record had is undone, then the opposite one is applied.
       * A sale consumes FIFO, a purchase arrives as its own cost lot. The write
       * fails if a sale cannot be covered, rather than creating a negative lot.
       */
      mode: (id: string, mode: RecordMode) => Effect.Effect<void, RecordError>;
      /**
       * Replaces the record's payments. `record_pay` is a cache of their sum, so
       * it is rewritten with them — pass the record's own `pay` when the only
       * thing changing is which method paid it.
       */
      methods: (
        id: string,
        methods: { methodId: string; pay: number }[],
      ) => Effect.Effect<void, RecordError>;
      /** Turns a purchase into a credit one: nothing tendered, nothing rounded. */
      toCredit: (id: string) => Effect.Effect<void, RecordError>;
      /**
       * Settles a credit record and stamps it as paid now. `rounding` is the
       * rounding that goes with the settlement, not the purchase's own.
       */
      payCredit: (
        id: string,
        input: { pay: number; rounding: number },
      ) => Effect.Effect<void, RecordError>;
      /**
       * Points a snapshotted line at a catalog listing, or back at nothing.
       * Stock is left alone — relinking is a bookkeeping act, not a movement.
       */
      linkListing: (
        recordListingId: string,
        listingId: string | null,
      ) => Effect.Effect<void, RecordError>;
    };
    delete: {
      /** Soft-deletes the record and removes the stock movement it caused. */
      byId: (id: string) => Effect.Effect<void, RecordError>;
    };
  }
>() {}
