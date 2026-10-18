import { Effect, Context, Data, Stream } from "effect";

export class SupplierError extends Data.TaggedError("SupplierError")<{ message: string }> {}

export type Supplier = {
  id: string;
  name: string;
  note: string;
};

/** The editable fields of a supplier — everything but its id. */
export type SupplierInput = {
  name: string;
  note: string;
};

export class SupplierService extends Context.Tag("SupplierService")<
  SupplierService,
  {
    get: {
      all: () => Effect.Effect<Supplier[], SupplierError>;
      /** Rows the sync layer has not pushed yet. */
      unsync: () => Effect.Effect<Supplier[], SupplierError>;
      changes: Stream.Stream<Supplier[], SupplierError>;
    };
    add: (name: string, note: string) => Effect.Effect<string, SupplierError>;
    set: { info: (id: string, info: SupplierInput) => Effect.Effect<void, SupplierError> };
    /** Soft-deletes the supplier; the row stays for sync. */
    delete: { byId: (id: string) => Effect.Effect<void, SupplierError> };
  }
>() {}
