import { Effect } from "effect";
import { updateCache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteImageById(id: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const productId = yield* sqlx.image.get.productId.one(id);
    yield* sqlx.image.delete.byId(id, now);
    updateCache(productId, (prev) => prev.filter((p) => p.id !== id));
  });
}
