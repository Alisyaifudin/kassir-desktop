import { DB } from "../instance";
import { Effect } from "effect";

export function getAllUnsyncImages() {
  return DB.select<DB.Image[]>("SELECT * FROM images WHERE image_sync_at IS NULL").pipe(
    Effect.map((res) => {
      const images = res.map((r) => ({
        id: r.image_id,
        name: r.image_name,
        mime: r.image_mime,
        order: r.image_order,
        productId: r.product_id,
        updatedAt: r.image_updated_at,
        deletedAt: r.image_deleted_at ?? undefined,
        syncAt: r.image_sync_at ?? undefined,
        hash: r.image_hash ?? undefined,
      }));
      return images;
    }),
  );
}
