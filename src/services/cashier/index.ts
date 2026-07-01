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
    loader(): Promise<CashierError | null>; // load all cashiers
    useCashiers(): Cashier[];
    add: (user: {
      name: string;
      role: DBNamespace.Role;
      password: string;
    }) => Effect.Effect<string, string>;
    delete(id: string): Promise<string | null>;
    set: {
      name(id: string, name: string): Promise<string | null>;
      hash: (id: string, hash: string) => Promise<string | null>;
      role: (id: string, role: DBNamespace.Role) => Promise<string | null>;
    };
    get: {
      all(): Effect.Effect<Cashier[], CashierError>;
      byId(id: string): Effect.Effect<CashierFull, CashierError | NotFoundError>;
    };
  }
>() {}
