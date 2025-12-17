import { db } from "~/database";

export async function loader() {
  const products = db.product.get.all();
  const extras = db.extra.get.all();
  return { products, extras };
}

export type Loader = typeof loader;
