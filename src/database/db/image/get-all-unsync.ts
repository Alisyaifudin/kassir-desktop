import { DB } from "../instance";
import { Effect } from "effect";
import { ImageFull } from "./cache";

export function getAllUnsync() {
  return DB.try((db) =>
    db.select<DB.Image[]>("SELECT * FROM images WHERE image_sync_at IS NULL"),
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
      return images;
    }),
  );
}
