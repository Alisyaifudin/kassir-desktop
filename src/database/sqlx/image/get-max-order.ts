import { DB } from "../instance";
import { Effect } from "effect";

export function getImageMaxOrder(productId: string) {
  return DB.select<{ max_order: number }[]>(
    `SELECT MAX(image_order) AS max_order FROM images WHERE product_id = $1`,
    [productId],
  ).pipe(
    Effect.map((r) => {
      if (r.length === 0) return 0;
      return r[0].max_order;
    }),
  );
}
