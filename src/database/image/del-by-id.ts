import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";
import { updateCache } from "./cache";

export function delById(productId: string, id: string) {
  const now = Date.now();
  const graveId = generateId();
  return DB.try((db) =>
    db.execute(
      `DELETE FROM images WHERE image_id = $1 AND product_id = $2;
       INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp)
       VALUES ($1, $3, 'image', $4)`,
      [id, productId, graveId, now],
    ),
  ).pipe(
    Effect.tap(() => {
      updateCache(productId, (prev) => prev.filter((p) => p.id !== id));
    }),
    Effect.asVoid,
  );
}
