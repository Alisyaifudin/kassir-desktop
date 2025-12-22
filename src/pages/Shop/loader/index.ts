import { db } from "~/database";
import { tx } from "~/transaction";
import { getDBItems } from "./get-db-items";

export async function loader() {
  const customers = db.customer.getAll();
  const methods = db.method.getAll();
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
