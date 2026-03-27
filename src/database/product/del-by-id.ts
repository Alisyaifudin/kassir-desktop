import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect, pipe } from "effect";
import { cache } from "./cache";

export function delById(id: string) {
  const now = Date.now();
  const graveId = generateId();
  return pipe(
    DB.try((db) =>
      db.execute(
        `BEGIN;
         DELETE FROM products WHERE product_id = $1;
         INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp) 
         VALUES ($1, $2, 'product', $3);
         COMMIT;`,
        [id, graveId, now],
      ),
    ),
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
