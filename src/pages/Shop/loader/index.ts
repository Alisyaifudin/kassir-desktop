import { db } from "~/database";
import { tx } from "~/transaction";
import { getDBItems } from "./get-db-items";
import { getMethod } from "./get-method";

export async function loader() {
  const customers = db.customer.getAll();
  const methods = getMethod();
  const product = getDBItems();
  const tabs = tx.transaction.get.all();
  return {
    customers,
    methods,
    product,
    tabs,
  };
}

export type Loader = typeof loader;
