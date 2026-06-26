import { Effect } from "effect";
import { MiddlewareFunction, redirect } from "react-router";
import { UserService } from "~/services/user";

export const authMiddlewareEffect = Effect.gen(function* () {
  const { user } = yield* UserService;
  const middleware: MiddlewareFunction = async (_arg, next) => {
    if (user === undefined) {
      throw redirect("/login");
    }
    await next();
  };
  return middleware;
});
