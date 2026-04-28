import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function delSync(id: string) {
  return DB.try((db) => db.execute(`DELETE FROM products WHERE product_id = $1`, [id])).pipe(
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
