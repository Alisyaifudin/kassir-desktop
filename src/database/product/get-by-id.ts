import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";
import { cache, type ProductFull } from "./cache";

export function getById(id: string) {
  return Effect.gen(function* () {
    if (cache.size > 0) {
      const product = cache.get(id);
      if (product === undefined) return yield* NotFound.fail("Barang tidak ditemukan");
      return product;
    }
    const res = yield* DB.try((db) =>
      db.select<DB.Product[]>("SELECT * FROM products WHERE product_id = $1", [id]),
    );
    if (res.length === 0) yield* NotFound.fail("Barang tidak ditemukan");
    const r = res[0];
    const item: ProductFull = {
      id: r.product_id,
      barcode: r.product_barcode ?? undefined,
      name: r.product_name,
      price: r.product_price,
      stock: r.product_stock,
      capital: r.product_capital,
      note: r.product_note,
      updatedAt: r.product_updated_at,
      syncAt: r.product_sync_at,
    };
    cache.update(id, item);
    return item;
  });
}
