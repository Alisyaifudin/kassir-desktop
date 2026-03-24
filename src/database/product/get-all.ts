import { DB } from "../instance";
import { Effect } from "effect";
import { cache, ProductFull } from "./cache";

export function all() {
  return Effect.gen(function* () {
    const products = cache.all();
    if (products !== null) {
      return products;
    }
    const res = yield* DB.try((db) => db.select<DB.Product[]>("SELECT * FROM products"));
    const items: ProductFull[] = res.map((r) => ({
      barcode: r.product_barcode ?? undefined,
      name: r.product_name,
      price: r.product_price,
      id: r.product_id,
      stock: r.product_stock,
      capital: r.product_capital,
      note: r.product_note,
      updatedAt: r.product_updated_at,
      syncAt: r.product_sync_at,
    }));
    cache.set(items);
    return items;
  });
}
