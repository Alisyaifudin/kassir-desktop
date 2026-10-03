import { Effect, Context, Data, Stream } from "effect";

export class CustomerError extends Data.TaggedError("CustomerError")<{ message: string }> {}

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

// export type CustomerFull = {
//   updatedAt: number;
//   syncAt: number | null;
// } & Customer;

export class CustomerService extends Context.Tag("CustomerService")<
  CustomerService,
  {
    get: {
      all: () => Effect.Effect<Customer[], CustomerError>;
      unsync: () => Effect.Effect<Customer[], CustomerError>;
      changes: Stream.Stream<Customer[], CustomerError>;
    };
    add: (name: string, phone: string) => Effect.Effect<string, CustomerError>;
    set: {
      info: (
        id: string,
        info: { name: string; phone: string },
      ) => Effect.Effect<void, CustomerError>;
      sync: (id: string) => Effect.Effect<void, CustomerError>;
    };
    delete: {
      byId: (id: string) => Effect.Effect<void, CustomerError>;
      sync: (id: string) => Effect.Effect<void, CustomerError>;
    };
  }
>() {}
