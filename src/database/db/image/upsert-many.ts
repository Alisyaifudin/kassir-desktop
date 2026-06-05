import { Effect } from "effect";
import { getCache, setCache, ImageFull } from "./cache";
import { sqlx } from "~/database/sqlx";

export function upsertManyImages({
  images,
  now,
}: {
  images: {
    id: string;
    name: string;
    mime: DB.Mime;
    order: number;
    productId: string;
    hash?: string;
    updatedAt: number;
  }[];
  now: number;
}) {
  return sqlx.image.upsert.many(images, now).pipe(
    Effect.tap(() => {
      // Group upserted images by productId
      const byProductId = new Map<string, ImageFull[]>();
      for (const img of images) {
        const group = byProductId.get(img.productId) ?? [];
        group.push({
          id: img.id,
          name: img.name,
          mime: img.mime,
          order: img.order,
          productId: img.productId,
          updatedAt: img.updatedAt,
          syncAt: now,
          hash: img.hash,
        });
        byProductId.set(img.productId, group);
      }
      // Merge into existing cache per productId
      for (const [productId, imgs] of byProductId) {
        const cached = getCache(productId);
        if (cached !== undefined) {
          const merged = [...cached];
          for (const img of imgs) {
            const idx = merged.findIndex((c) => c.id === img.id);
            if (idx !== -1) {
              merged[idx] = img;
            } else {
              merged.push(img);
            }
          }
          setCache(productId, merged);
        } else {
          setCache(productId, imgs);
        }
      }
    }),
  );
}
