import { Context, Effect } from "effect";
import { UserError } from "./error";
import { Cashier } from "../cashier";
export { UserError };

export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    loader(): Effect.Effect<void, UserError>;
    readonly useUser: () => Cashier;
    readonly useAuth: () => Cashier | null;
    readonly user?: Cashier;
    setUser: (user: Cashier) => Effect.Effect<void, UserError>;
    logout: () => void;
    login: (user: Cashier) => void;
  }
>() {}
