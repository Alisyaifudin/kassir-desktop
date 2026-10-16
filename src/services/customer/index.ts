import { Effect, Context, Data, Stream } from "effect";

export class CustomerError extends Data.TaggedError("CustomerError")<{ message: string }> {}

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

/** The editable fields of a customer — everything but its id. */
export type CustomerInput = {
  name: string;
  phone: string;
};

export class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    get: {
      all: () => Effect.Effect<Customer[], CustomerError>;
      /** Rows the sync layer has not pushed yet. */
      unsync: () => Effect.Effect<Customer[], CustomerError>;
      changes: Stream.Stream<Customer[], CustomerError>;
    };
    add: (name: string, phone: string) => Effect.Effect<string, CustomerError>;
    set: { info: (id: string, info: CustomerInput) => Effect.Effect<void, CustomerError> };
    /** Soft-deletes the customer; the row stays for sync. */
    delete: { byId: (id: string) => Effect.Effect<void, CustomerError> };
  }
>() {}
