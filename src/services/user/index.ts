import { Context } from "effect";
import { UserError } from "./error";
import { Cashier } from "../cashier";
export { UserError };

export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    loader(): Promise<UserError | null>;
    readonly useUser: () => Cashier;
    readonly user?: Cashier;
    setUser: (user: Cashier) => Promise<string | null>;
    logout: () => void;
    login: (user: Cashier) => void;
  }
>() {}
