import { DB } from "../instance";
import { Effect } from "effect";
import { getCache, Image, ImageFull, setCache } from "./cache";

export function getByProductId(productId: string) {
  const cache = getCache(productId);
  if (cache !== undefined) {
    return Effect.succeed(cache);
  }
  return DB.try((db) =>
    db.select<DB.Image[]>("SELECT * FROM images WHERE product_id = $1 ORDER BY image_order", [
      productId,
    ]),
  ).pipe(
    Effect.map((res) => {
      const images: ImageFull[] = res.map((r) => ({
        id: r.image_id,
        name: r.image_name,
        mime: r.image_mime,
        order: r.image_order,
        productId: r.product_id,
        syncAt: r.image_sync_at,
        updatedAt: r.image_updated_at,
      }));
      setCache(productId, images);
      return images as Image[];
    }),
  );
}
