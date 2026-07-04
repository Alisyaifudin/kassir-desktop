import { Context, Effect } from "effect";
import { CashierError } from "./error";
import { NotFoundError } from "~/lib/error-effect";

export { CashierError } from "./error";

export type Cashier = {
  name: string;
  role: DBNamespace.Role;
  id: string;
};

export type CashierFull = Cashier & {
  hash: string;
};

export class CashierService extends Context.Tag("CashierService")<
  CashierService,
  {
    loader(): Effect.Effect<void, CashierError>; // load all cashiers
    useCashiers(): Cashier[];
    get: {
      all(): Effect.Effect<Cashier[], CashierError>;
      byId(id: string): Effect.Effect<CashierFull, CashierError | NotFoundError>;
    };
    add: (user: {
      name: string;
      role: DBNamespace.Role;
      password: string;
    }) => Effect.Effect<Cashier, CashierError>;
    delete(id: string): Effect.Effect<void, CashierError>;
    set: {
      name(id: string, name: string): Effect.Effect<void, CashierError>;
      hash: (id: string, hash: string) => Effect.Effect<void, CashierError>;
      role: (id: string, role: DBNamespace.Role) => Effect.Effect<void, CashierError>;
    };
  }
>() {}
