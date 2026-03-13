import { MiddlewareFunction, redirect } from "react-router";
import { auth } from "~/lib/auth-effect";

export const admin: MiddlewareFunction = async (_arg, next) => {
  const user = auth.user();
  if (user.role !== "admin") {
    throw redirect("/setting");
  }
  return next();
};
