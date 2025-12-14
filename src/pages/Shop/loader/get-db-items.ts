import { db } from "~/database";
import { Extra } from "~/database/extra/caches";
import { Product } from "~/database/product/caches";
import { DefaultError, err, ok, Result } from "~/lib/utils";

export type DBItems = Result<
  DefaultError,
  {
    products: Product[];
    extras: Extra[];
  }
>;

export async function getDBItems(): Promise<DBItems> {
  const [[errProd, products], [errAdd, extras]] = await Promise.all([
    db.product.get.all(),
    db.extra.get.all(),
  ]);
  if (errProd !== null) {
    return err(errProd);
  }
  if (errAdd !== null) {
    return err(errAdd);
  }
  return ok({
    products,
    extras,
  });
}
