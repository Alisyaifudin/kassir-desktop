import { DB } from "../instance";
import { Effect } from "effect";
import { updateCache } from "./cache";

export function delSync(productId: string, id: string) {
  return DB.try((db) =>
    db.execute(
      `DELETE FROM images WHERE image_id = $1 AND product_id = $2;
       DELETE FROM graves WHERE grave_item_id = $3 AND grave_kind = 'image';`,
      [id, productId, id],
    ),
  ).pipe(
    Effect.tap(() => {
      updateCache(productId, (prev) => prev.filter((p) => p.id !== id));
    }),
    Effect.asVoid,
  );
}
