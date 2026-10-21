import { Effect, Context, Data, Stream } from "effect";
import type { NotFound } from "~/lib/effect-error";

export class TransactionError extends Data.TaggedError("TransactionError")<{
  message: string;
}> {}

/**
 * A refused submission that the cashier can act on. `kind` lets the page route
 * it: the listing-side problems are shown inline, everything else as a toast.
 */
export class SubmitError extends Data.TaggedError("SubmitError")<{
  kind: "empty" | "stored" | "payment" | "name" | "code" | "price" | "outcoming";
  message: string;
}> {}

/** Which way goods move: `incoming` is a sale, `outcoming` a purchase. */
export type DraftMode = "incoming" | "outcoming";

/** `tx_record_flag` bit 0: a stored (pending) cart, not an active tab. */
export const STORED_FLAG = 0b01;

/** One payment applied to a draft; a draft may have several. */
export type DraftMethod = {
  id: string;
  methodId: string;
  value: number;
};

/** One discount on a draft listing; `eff` is what it takes off the running total. */
export type DraftDiscount = {
  id: string;
  value: number;
  kind: "number" | "percent" | "pcs";
  eff: number;
  total: number;
};

/**
 * A line in the draft cart. The catalog values are snapshotted here, so a
 * later price change does not rewrite a draft that is already open.
 */
export type DraftListing = {
  id: string;
  listingId?: string | null;
  name: string;
  code: string;
  unit: number;
  price: number;
  qty: number;
  discounts: DraftDiscount[];
  /** Catalog values the line started from (UI-only, not persisted). */
  base?: { name: string; code: string; unit: number; price: number };
};

/** A charge or deduction on the draft as a whole. */
export type DraftExtra = {
  id: string;
  name: string;
  kind: "number" | "percent";
  value: number;
};

/** The mime types an image may carry — the values in `img_mimes`. */
export type DraftImageMime = "image/png" | "image/jpeg" | "image/webp";

/**
 * A reference to an image on disk, keyed by `name`. The bytes live under
 * AppData/images/; this is only the row. On submit the reference moves to
 * `record_images` and the file is left where it is.
 */
export type DraftImage = {
  id: string;
  order: number;
  name: string;
  mime: DraftImageMime;
};

/**
 * The in-progress cart being assembled: the counterparty, the money settings,
 * and the payments. `tx_*` in the database; `records` is written by `submit`,
 * which commits the cart and removes its `tx_records` row in one transaction.
 */
export type Draft = {
  id: string;
  /** Tab position; not unique by design (users reorder). */
  order: number;
  /** Local flag bitfield; bit 0 marks a stored (pending) cart. */
  flag: number;
  title: string;
  mode: DraftMode;
  /** Decimal places money is shown with — presentation only. */
  fix: number;
  note: string;
  customerId: string | null;
  /** A new customer's typed name, used when `customerId` is null. */
  customerName: string;
  /** A new customer's typed phone; optional. */
  customerPhone: string;
  supplierId: string | null;
  /** A new supplier's typed name, used when `supplierId` is null. */
  supplierName: string;
  rounding: number;
  listings: DraftListing[];
  extras: DraftExtra[];
  methods: DraftMethod[];
  images: DraftImage[];
};

export class TransactionService extends Context.Tag("TransactionService")<
  TransactionService,
  {
    get: {
      drafts: (mode: DraftMode) => Effect.Effect<Draft[], TransactionError>;
      byId: (id: string) => Effect.Effect<Draft, TransactionError | NotFound>;
      changes: Stream.Stream<Draft[], TransactionError>;
    };
    add: { new: (mode: DraftMode) => Effect.Effect<string, TransactionError> };
    /**
     * Commit the draft as a record, in one transaction: the record and its
     * lines, the stock movements, and the `tx_*` deletion. Returns the record id.
     * The cashier is the only thing the draft cannot know.
     */
    submit: (
      id: string,
      input: { cashier: string },
    ) => Effect.Effect<string, TransactionError | SubmitError>;
    /**
     * Undo a submission: write the record back as a draft, then delete the
     * record (which reverses its stock movement). Returns the new draft id.
     */
    unsubmit: (recordId: string) => Effect.Effect<string, TransactionError>;
    /** Hard delete: a cart is transient working state, not synced history. */
    delete: { byId: (id: string) => Effect.Effect<void, TransactionError> };
    set: {
      title: (id: string, title: string) => Effect.Effect<void, TransactionError>;
      fix: (id: string, fix: number) => Effect.Effect<void, TransactionError>;
      note: (id: string, note: string) => Effect.Effect<void, TransactionError>;
      customer: (id: string, customerId: string | null) => Effect.Effect<void, TransactionError>;
      customerName: (id: string, name: string) => Effect.Effect<void, TransactionError>;
      customerPhone: (id: string, phone: string) => Effect.Effect<void, TransactionError>;
      supplier: (id: string, supplierId: string | null) => Effect.Effect<void, TransactionError>;
      supplierName: (id: string, name: string) => Effect.Effect<void, TransactionError>;
      rounding: (id: string, rounding: number) => Effect.Effect<void, TransactionError>;
      /** Parks the cart: it leaves the active tabs but stays in the list. */
      store: (id: string) => Effect.Effect<void, TransactionError>;
      /** Pulls a parked cart back into the active tabs. */
      restore: (id: string) => Effect.Effect<void, TransactionError>;
    };
    listings: {
      set: (id: string, listings: DraftListing[]) => Effect.Effect<void, TransactionError>;
    };
    extras: {
      set: (id: string, extras: DraftExtra[]) => Effect.Effect<void, TransactionError>;
    };
    methods: {
      set: (id: string, methods: DraftMethod[]) => Effect.Effect<void, TransactionError>;
    };
    images: {
      /**
       * Saves the file to disk and records the reference. The service owns both
       * halves so a draft's rows and its files cannot drift apart.
       */
      add: (id: string, file: File) => Effect.Effect<string, TransactionError>;
      remove: (id: string, imageId: string) => Effect.Effect<void, TransactionError>;
    };
  }
>() {}
