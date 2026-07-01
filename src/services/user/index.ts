import { Context } from "effect";
import { UserError } from "./error";
import { Cashier } from "../cashier";

export class UserService extends Context.Tag("UserService")<
  UserService,
  {
    loader(): Promise<UserError | null>;
    readonly useUser: () => Cashier;
    readonly user?: Cashier;
    logout: () => void;
    setUser: (user: Cashier) => void;
  }
>() {}
