import { Effect } from "effect";
import { MiddlewareFunction, redirect } from "react-router";
import { UserService } from "~/services/user";

export const loginMiddlewareEffect = Effect.gen(function* () {
  const service = yield* UserService;
  const user = service.user;
  const middleware: MiddlewareFunction = async (_arg, next) => {
    if (user !== undefined) {
      throw redirect("/");
    }
    await next();
  };
  return middleware;
});
