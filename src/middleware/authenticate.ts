import { MiddlewareFunction, redirect } from "react-router";
import { auth } from "~/lib/auth";

export const authentication: MiddlewareFunction = async (_arg, next) => {
  const user = auth.get();
  if (user === undefined) {
    throw redirect("/login");
  }
  await next();
};
