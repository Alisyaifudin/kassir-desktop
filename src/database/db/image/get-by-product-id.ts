import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache, ImageFull } from "./cache";

export function getImagesByProductId(productId: string) {
  const images = cache.get(productId);
  if (images !== undefined) {
    return Effect.succeed(images);
  }
  return sqlx.image.get.byProductId(productId).pipe(
    Effect.map((images) => {
      cache.set(productId, images);
      return images as ImageFull[];
    }),
  );
}
