import { generateId } from "~/lib/random";
import { Effect } from "effect";
import { getCache, updateCache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function addNewImage({
  name,
  mime,
  productId,
}: {
  name: string;
  mime: DB.Mime;
  productId: string;
}) {
  const now = Date.now();
  const id = generateId();
  return Effect.gen(function* () {
    const maxOrder = yield* getMaxOrder(productId);
    yield* sqlx.image.add.one({ name, mime, productId, maxOrder, now });
    updateCache(productId, (prev) => [
      ...prev,
      {
        id,
        mime,
        name,
        productId,
        order: maxOrder + 1,
        updatedAt: now,
      },
    ]);
    return id;
  });
}

function getMaxOrder(productId: string) {
  const cache = getCache(productId);
  if (cache !== undefined) {
    if (cache.length === 0) return Effect.succeed(0);
    const maxOrder = Math.max(...cache.map((c) => c.order));
    return Effect.succeed(maxOrder);
  }
  return sqlx.image.get.maxOrder(productId);
}
