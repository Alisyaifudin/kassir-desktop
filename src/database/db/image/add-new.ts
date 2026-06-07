import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";

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
  return Effect.gen(function* () {
    const maxOrder = yield* getMaxOrder(productId);
    const id = yield* sqlx.image.add.new({ name, mime, productId, maxOrder, now });
    cache.update(productId, (prev) => [
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
  const image = cache.get(productId);
  if (image !== undefined) {
    if (image.length === 0) return Effect.succeed(0);
    const maxOrder = Math.max(...image.map((c) => c.order));
    return Effect.succeed(maxOrder);
  }
  return sqlx.image.get.maxOrder(productId);
}
