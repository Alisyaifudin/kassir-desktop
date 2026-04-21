import { ProductServer } from "~/server/product/get";
import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

export function sync({ capital, id, name, note, price, stock, updatedAt, barcode }: ProductServer) {
  return Effect.gen(function* () {
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(
        `UPDATE products SET product_barcode = $1, product_name = $2, product_price = $3, 
        product_stock = $4, product_capital = $5, product_note = $6, product_updated_at = $7, 
        product_sync_at = $8 WHERE product_id = $9`,
        [barcode ?? null, name, price, stock, capital, note, updatedAt, now, id],
      ),
    );
    cache.update(id, {
      capital,
      id,
      name,
      note,
      price,
      stock,
      updatedAt,
      barcode,
      syncAt: now,
    });
  });
}
