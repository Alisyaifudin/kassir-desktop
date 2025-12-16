import { data } from "react-router";
import { db } from "~/database";

export async function loader() {
  const customers = db.customer.getAll();
  return data(customers);
}

export type Loader = typeof loader;
