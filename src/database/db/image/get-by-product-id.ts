import { Effect } from "effect";
import { getCache, ImageFull, setCache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getImagesByProductId(productId: string) {
  const cache = getCache(productId);
  if (cache !== undefined) {
    return Effect.succeed(cache);
  }
  return sqlx.image.get.byProductId(productId).pipe(
    Effect.map((images) => {
      setCache(productId, images);
      return images as ImageFull[];
    }),
  );
}
