import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";

export function deleteImageById(id: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const productId = yield* sqlx.image.get.productId.one(id);
    yield* sqlx.image.delete.byId(id, now);
    cache.update(productId, (prev) => prev.filter((p) => p.id !== id));
  });
}
