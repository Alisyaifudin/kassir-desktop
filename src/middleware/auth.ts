import { Effect } from "effect";
import { MiddlewareFunction, redirect } from "react-router";
import { CashierService } from "~/services/cashier";

export const authMiddlewareEffect = Effect.gen(function* () {
  const cashier = yield* CashierService;
  const user = cashier.current.user;
  const middleware: MiddlewareFunction = async (_arg, next) => {
    if (user === undefined) {
      throw redirect("/login");
    }
    await next();
  };
  return middleware;
});
