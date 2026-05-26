import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";
import { getCache, updateCache } from "./cache";

export function add({ name, mime, productId }: { name: string; mime: DB.Mime; productId: string }) {
  const now = Date.now();
  const id = generateId();
  return Effect.gen(function* () {
    const maxOrder = yield* getMaxOrder(productId);
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO images (image_id, image_name, image_mime, image_order, product_id, 
         image_updated_at, image_sync_at) 
         VALUES ($1, $2, $3, $4, $5, $6, null)`,
        [id, name, mime, productId, maxOrder + 1, now],
      ),
    );
    updateCache(productId, (prev) => [
      ...prev,
      {
        id,
        mime,
        name,
        productId,
        syncAt: null,
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
  return DB.try((db) =>
    db.select<{ image_order: number }[]>(`SELECT image_order FROM images WHERE product_id = $1`, [
      productId,
    ]),
  ).pipe(
    Effect.map((r) => {
      if (r.length === 0) return 0;
      const maxOrder = Math.max(...r.map((c) => c.image_order));
      return maxOrder;
    }),
  );
}
