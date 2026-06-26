import { DB } from "../instance";
import { Effect } from "effect";

export function getImagesByProductId(productId: string) {
  return DB.select<DBNamespace.Image[]>(
    `SELECT * FROM images WHERE product_id = $1 AND image_deleted_at IS NULL
     ORDER BY image_order`,
    [productId],
  ).pipe(
    Effect.map((res) => {
      const images = res.map((r) => ({
        id: r.image_id,
        name: r.image_name,
        mime: r.image_mime,
        order: r.image_order,
        productId: r.product_id,
        updatedAt: r.image_updated_at,
        syncAt: r.image_sync_at ?? undefined,
        hash: r.image_hash ?? undefined,
      }));
      return images;
    }),
  );
}
