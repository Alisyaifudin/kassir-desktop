import { Effect, Context, Data, Stream } from "effect";
import type { NotFound } from "~/lib/effect-error";
import type { MethodKind, ValueKind } from "~/lib/constants";

export type { ValueKind };

export class RecordError extends Data.TaggedError("RecordError")<{ message: string }> {}

/**
 * `records.record_flag` bit 0: a hand-typed adjustment (the `/transaction`
 * screen), not a sale or purchase of goods. Such a record carries extras and no
 * listings, and moves no stock, so every stock/report read that assumes "a
 * record sold something" has to skip it.
 */
export const RECORD_FLAG_ADJUSTMENT = 0b1;

/** A hand-typed record: extras only, one payment, no goods. */
export type RecordAdjustmentInput = {
  mode: RecordMode;
  cashier: string;
  note: string;
  methodId: string;
  /** A line is an `Extra` of kind `number`; `eff` is its value. */
  extras: { name: string; value: number }[];
};

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

/** One lot portion of a line — the internal split, never shown as its own row. */
export type RecordListingPortion = {
  id: string;
  /** The journal movement this portion caused; null for a manual/pre-journal line. */
  productEventId: string | null;
  /** The lot the event currently points at; null when unlinked (dangling). */
  stockId: string | null;
  productId: string | null;
  unit: number;
  qty: number;
  capital: number;
  total: number;
};

/**
 * A line as the receipt/detail sees it: the entered line, regrouped from its
 * portions. `qty`/`total` are the sums, `capital` the qty-weighted average, and
 * the discounts are the per-portion copies merged back into one each.
 */
export type RecordListing = {
  id: string;
  productId: string | null;
  name: string;
  kind: string;
  unit: number;
  price: number;
  qty: number;
  capital: number;
  total: number;
  discounts: Discount[];
  /** The internal per-lot rows, oldest first. */
  portions: RecordListingPortion[];
};

export type RecordExtra = {
  id: string;
  name: string;
  value: number;
  eff: number;
  kind: ValueKind;
  /**
   * The catalogue extra's flags as they stood at submit (`extras.extra_flag`).
   * `DUAL_FLAG` marks a charge that also books an extras-only `outcoming` twin.
   */
  flag: number;
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
  /** Immutable creation time. */
  createdAt: number;
  /**
   * The effective date the record belongs to: settlement date when paid,
   * otherwise the credit date, otherwise creation.
   */
  date: number;
  /** Null while an outstanding credit has not been settled. */
  paidAt: number | null;
  /** When the credit was opened; null for a cash record. */
  creditAt: number | null;
  rounding: number;
  /** True only while the credit is still outstanding. */
  isCredit: boolean;
  cashier: string;
  mode: RecordMode;
  pay: number;
  note: string;
  fix: number;
  customer: { name: string; phone: string };
  supplier: { id: string | null; name: string };
  subTotal: number;
  total: number;
  grandTotal: number;
  change: number;
  methods: RecordMethod[];
  updatedAt: number;
  syncAt: number | null;
  deletedAt: number | null;
  /**
   * The other half of a paired record — a sale and the extras-only `outcoming`
   * twin its `dual` charges produced. `null` for every ordinary record. See
   * `RecordMirrorInput`.
   */
  pairId: string | null;
};

export type RecordFull = Record & {
  listings: RecordListing[];
  extras: RecordExtra[];
};

/**
 * An unsettled credit record. `payCredit` stamps `paid_at`, so a record is
 * outstanding exactly while `credit_at` is set and `paid_at` is still null.
 */
export type DebtRecord = {
  id: string;
  /** Effective credit date, kept under `paidAt` for the existing debt views. */
  paidAt: number;
  creditAt: number;
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
/**
 * A line the live Pos/Restock cart hands to the record writer. The cart is the
 * editable source; this is the frozen shape the writer needs. `price` is per
 * listing unit, `qty` is in listing units, and `unit` converts them to pcs.
 */
export type RecordDraftListing = {
  listingId: string | null;
  name: string;
  code: string;
  kind: string;
  unit: number;
  price: number;
  qty: number;
  discounts: { kind: DiscountKind; value: number; eff: number }[];
};

export type RecordDraftExtra = {
  name: string;
  value: number;
  eff: number;
  kind: ValueKind;
  /** `extras.extra_flag` at submit; `DUAL_FLAG` is what makes a twin. */
  flag: number;
};

/**
 * The extras-only `outcoming` record a sale commits alongside itself when its
 * cart carried a `dual` extra — the same money seen from the paying-out side.
 *
 * It has no listings, no stock movement and no rounding: its lines are the
 * dual extras and nothing else, so `sub_total`, `total` and `pay` are all the
 * sum of `extras[].eff`. The writer books it with `RECORD_FLAG_ADJUSTMENT`,
 * settles it in cash, and links the pair both ways through
 * `records.record_pair_id` — inside the same transaction as the sale, so one
 * half can never be stored without the other.
 */
export type RecordMirrorInput = {
  mode: RecordMode;
  cashier: string;
  note: string;
  fix: number;
  /** The method the twin is settled with; the caller passes cash. */
  methodId: string;
  extras: RecordDraftExtra[];
};

/**
 * The whole cart commit: the record header, its frozen lines and extras, the
 * payments, and the pending customer. `draftId` is the `tx_records` row the
 * commit deletes in the same transaction.
 */
export type RecordDraftInput = {
  draftId: string;
  paidAt: number | null;
  creditAt: number | null;
  rounding: number;
  cashier: string;
  mode: RecordMode;
  pay: number;
  note: string;
  fix: number;
  customer: { id: string | null; name: string; phone: string };
  supplier: { id: string | null; name: string };
  subTotal: number;
  total: number;
  methods: { methodId: string; pay: number }[];
  listings: RecordDraftListing[];
  extras: RecordDraftExtra[];
  images: { order: number; name: string; mime: "image/png" | "image/jpeg" | "image/webp" }[];
  /**
   * The twin to write in the same commit, when the cart had a `dual` extra.
   * Absent for an ordinary record, and for any mode but `incoming`: a dual
   * charge is a sale-side concept here, so a purchase cart writes one record.
   */
  mirror?: RecordMirrorInput;
};

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
  supplier?: { id: string | null; name: string };
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
      byRange: (start: number, end: number, query?: string) => Effect.Effect<Record[], RecordError>;
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
       * Writes a hand-typed record: the extras are its only lines, one method
       * pays the sum of them, and the header carries `RECORD_FLAG_ADJUSTMENT`.
       * No stock moves, because no listing is sold or bought.
       */
      adjustment: (input: RecordAdjustmentInput) => Effect.Effect<string, RecordError>;
      /**
       * Writes a record that was made elsewhere, under a new id. A sale takes its
       * stock FIFO and a purchase arrives as a cost lot, exactly as a live record
       * would. Fails, writing nothing, when a sale's stock cannot cover a line.
       */
      external: (input: RecordImport) => Effect.Effect<void, RecordError>;
      /**
       * Commit a live cart: writes the record and its stock movements, deletes
       * the `tx_records` row that produced it, and returns the new record id.
       * A sale (`incoming`) drains lots oldest-first and may leave the last lot
       * negative; a manual line creates its product and listing too.
       *
       * When `input.mirror` is set, the extras-only `outcoming` twin is written
       * in the same commit, both rows stamped with each other's id in
       * `record_pair_id` — so a sale and its twin are one unit of work.
       */
      draft: (input: RecordDraftInput) => Effect.Effect<string, RecordError>;
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
      paidAt: (id: string, paidAt: number | null) => Effect.Effect<void, RecordError>;
      /** Changes the credit date; only meaningful on a credit record. */
      creditAt: (id: string, creditAt: number) => Effect.Effect<void, RecordError>;
      note: (id: string, note: string) => Effect.Effect<void, RecordError>;
      /**
       * Replaces the record with a new one in the other mode: the old row is
       * soft-deleted, every child is re-pointed, and the stock journal's signs
       * are flipped. Returns the new record id.
       */
      mode: (id: string, mode: RecordMode) => Effect.Effect<string, RecordError>;
      /** Opens a credit on the record: nothing tendered, nothing rounded. */
      toCredit: (id: string) => Effect.Effect<void, RecordError>;
      /**
       * Settles a credit record and stamps it as paid now. `rounding` is the
       * rounding that goes with the settlement, not the purchase's own.
       */
      payCredit: (
        id: string,
        input: { pay: number; rounding: number },
      ) => Effect.Effect<void, RecordError>;
    };
    delete: {
      /**
       * Soft-deletes the record and removes the stock movement it caused. A
       * paired record takes its twin with it: undoing a sale must not leave the
       * extras-only `outcoming` half behind as a stray expense.
       */
      byId: (id: string) => Effect.Effect<void, RecordError>;
    };
  }
>() {}
