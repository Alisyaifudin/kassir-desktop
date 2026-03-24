import { Effect } from "effect";
import { DB } from "../instance";
import { cache } from "./cache";

export function incStock(id: string, qty: number) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE products SET product_stock = product_stock + $1, product_updated_at = $2,
       product_sync_at = null WHERE product_id = $3`,
      [qty, now, id],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => {
        prev.stock -= qty;
        prev.updatedAt = now;
        prev.syncAt = null;
        return prev;
      });
    }),
    Effect.asVoid,
  );
}
