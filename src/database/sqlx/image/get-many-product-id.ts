import { Effect } from "effect";
import { DB } from "../instance";

export function getManyImageProductId(ids: string[]) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return DB.select<{ product_id: string; image_id: string }[]>(
    `SELECT product_id, image_id FROM images WHERE image_id IN (${placeholders})`,
    [ids],
  ).pipe(Effect.map((res) => res.map((r) => ({ productId: r.product_id, id: r.image_id }))));
}
