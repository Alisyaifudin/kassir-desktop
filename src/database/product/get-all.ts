import { getCache, setCache } from "./caches";
import { DB } from "../instance";
import { Effect } from "effect";

type Output = Pick<
  DB.Product,
  | "product_id"
  | "product_barcode"
  | "product_name"
  | "product_stock"
  | "product_price"
  | "product_capital"
>;

export function all() {
  return Effect.gen(function* () {
    const cache = getCache();
    if (cache !== null) return cache;
    const res = yield* DB.try((db) =>
      db.select<Output[]>(
        "SELECT product_id, product_barcode, product_name, product_stock, product_price, product_capital FROM products",
      ),
    );
    const items = res.map((r) => ({
      barcode: r.product_barcode ?? undefined,
      name: r.product_name,
      price: r.product_price,
      id: r.product_id,
      stock: r.product_stock,
      capital: r.product_capital,
    }));
    setCache(items);
    return items;
  });
}
