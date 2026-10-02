import { Effect, Context, Data } from "effect";
import { NotFound } from "~/lib/effect-error";

export class CashierError extends Data.TaggedError("CashierError")<{ message: string }> {}

export type Role = "admin" | "user";

export type Cashier = {
  id: string;
  role: Role;
  name: string;
};
export type CashierFull = {
  hash: string;
} & Cashier;

export class CashierService extends Context.Tag("CashierService")<
  CashierService,
  {
    get: {
      all: () => Effect.Effect<Cashier[], CashierError>;
      byId: (id: string) => Effect.Effect<CashierFull, CashierError | NotFound>;
    };
    set: {
      name: (id: string, name: string) => Effect.Effect<void, CashierError>;
      password: (id: string, password: string) => Effect.Effect<void, CashierError>;
      role: (id: string, role: Role) => Effect.Effect<void, CashierError>;
    };
    delete: (id: string) => Effect.Effect<void, CashierError>;
    add: (cashier: CashierFull) => Effect.Effect<void, CashierError>;
  }
>() {}
