import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";

export function deleteManyImagesSync(ids: string[], now: number) {
  return Effect.gen(function* () {
    const productIds = yield* sqlx.image.get.productId.many(ids);
    yield* sqlx.image.sync.delete.many(ids, now);
    productIds.forEach(({ productId, id }) =>
      cache.update(productId, (prev) => prev.filter((p) => p.id !== id)),
    );
  });
}
