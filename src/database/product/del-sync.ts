import { DB } from "../instance";
import { Effect } from "effect";
import { productCache } from "./cache";

export function delSync(id: string) {
  return DB.try((db) => db.execute(`DELETE FROM products WHERE product_id = $1`, [id])).pipe(
    Effect.tap(() => {
      productCache.delete(id);
    }),
    Effect.asVoid,
  );
}
