import { Effect } from "effect";
import { updateCache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyImagesSync(ids: string[], now: number) {
  return Effect.gen(function* () {
    const productIds = yield* sqlx.image.get.productId.many(ids);
    yield* sqlx.image.delete.sync.many(ids, now);
    productIds.forEach(({ productId, id }) =>
      updateCache(productId, (prev) => prev.filter((p) => p.id !== id)),
    );
  });
}
