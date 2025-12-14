import { db } from "~/database";
import { getDBItems } from "./get-db-items";
import { getTab } from "./get-tab";
import { LoaderFunctionArgs } from "react-router";
import { tx } from "~/transaction";

export async function loader({ request }: LoaderFunctionArgs) {
  const [errMsg, tabs] = await tx.transaction.get.all();
  if (errMsg) {
    throw new Error(errMsg);
  }
  if (tabs.length === 0) {
    const [errMsg, tab] = await tx.transaction.add();
    if (errMsg) {
      throw new Error(errMsg);
    }
    tabs.push({ tab, mode: "sell" });
  }
  const search = new URL(request.url).searchParams;
  const tab = getTab(search, tabs);
  const customers = db.customer.getAll();
  const methods = db.method.getAll();
  const product = getDBItems();
  const transaction = tx.transaction.get.byTab(tab);
  const products = tx.product.getByTab(tab);
  const extras = tx.extra.getByTab(tab);
  return {
    customers,
    methods,
    product,
    transaction,
    products,
    extras,
    tabs,
  };
}

export type Loader = typeof loader;
