import { DB } from "../instance";
import { Effect } from "effect";
import { ProductServer } from "~/server/product/get";

const LIMIT_PRODUCT = 10_000;
export function getUnsync(upto: number) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.Product[]>(
        `SELECT * FROM products WHERE product_sync_at IS NULL AND product_updated_at < $1 
        ORDER BY product_sync_at LIMIT $1`,
        [upto, LIMIT_PRODUCT],
      ),
    );
    const items: ProductServer[] = res.map((r) => ({
      barcode: r.product_barcode ?? undefined,
      name: r.product_name,
      price: r.product_price,
      id: r.product_id,
      stock: r.product_stock,
      capital: r.product_capital,
      note: r.product_note,
      updatedAt: r.product_updated_at,
    }));
    return items;
  });
}
