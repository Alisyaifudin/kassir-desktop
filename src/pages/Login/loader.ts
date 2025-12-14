import { data, redirect } from "react-router";
import { db } from "~/database";
import { auth } from "~/lib/auth";

export async function loader() {
  const user = auth.get();
  if (user !== undefined) {
    throw redirect("/setting");
  }
  const cashiers = db.cashier.get.all();
  return data(cashiers);
}

export type Loader = typeof loader;
