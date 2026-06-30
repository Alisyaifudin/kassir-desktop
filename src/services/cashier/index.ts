import { Context, Effect } from "effect";
import { NotFoundError } from "~/lib/error-effect";
import { CashierError } from "./error";

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
    get: {
      all: () => Effect.Effect<Cashier[], CashierError>;
      byId: (id: string) => Effect.Effect<CashierFull, CashierError | NotFoundError>;
    };
    add: (user: {
      name: string;
      role: DBNamespace.Role;
      hash: string;
    }) => Effect.Effect<string, CashierError>;
    update: {
      name: (id: string, name: string) => Effect.Effect<void, CashierError>;
      hash: (id: string, hash: string) => Effect.Effect<void, CashierError>;
    };
    current: {
      readonly useUser: () => Cashier;
      readonly user?: Cashier;
      setUser: (user: Cashier) => void;
    };
  }
>() {}
