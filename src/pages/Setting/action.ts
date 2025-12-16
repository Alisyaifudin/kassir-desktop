import { redirect } from "react-router";
import { auth } from "~/lib/auth";

export async function action() {
  auth.set(undefined);
  throw redirect("/login");
}

export type Action = typeof action;
