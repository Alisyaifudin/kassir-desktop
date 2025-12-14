import { MiddlewareFunction, redirect } from "react-router";
import { auth } from "~/lib/user";

export const admin: MiddlewareFunction = async (_arg, next) => {
  const user = auth.get()!;
  if (user.role !== "admin") {
    throw redirect("/setting");
  }
  return next();
};
