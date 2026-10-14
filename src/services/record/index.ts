import { Effect, Context, Data, Stream } from "effect";
import type { NotFound } from "~/lib/effect-error";
import type { MethodKind } from "~/lib/constants";

export class RecordError extends Data.TaggedError("RecordError")<{ message: string }> {}

/** `outcoming` = penjualan (income), `incoming` = pembelian (expense). */
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
