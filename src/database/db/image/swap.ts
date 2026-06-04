import { Effect } from "effect";
import { DB } from "../instance";
import { getCache, updateCache } from "./cache";
import { NotFound } from "~/lib/effect-error";
import { produce } from "immer";

export function swap(a: string, b: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const [prodA, prodB] = yield* Effect.all([getOrder(a), getOrder(b)]);
    yield* DB.try((db) =>
      db.execute(
        `UPDATE images SET image_sync_at = null, updated_at = $1, image_order = $2 WHERE image_id = $3;
         UPDATE images SET image_sync_at = null, updated_at = $1, image_order = $4 WHERE image_id = $5;`,
        [now, prodB.order, a, prodA.order, b],
      ),
    );
    updateCache(
      prodA.productId,
      produce((draft) => {
        const idxA = draft.findIndex((d) => d.id === a);
        const idxB = draft.findIndex((d) => d.id === b);
        if (idxA === -1 || idxB === -1) return;
        draft[idxA].order = prodB.order;
        draft[idxB].order = prodA.order;
      }),
    );
  });
}

function getOrder(id: string) {
  const cache = getCache(id);
  if (cache !== undefined) {
    const image = cache.find((c) => c.id === id);
    if (image === undefined) return NotFound.fail("Gambar tidak ditemukan");
    return Effect.succeed({ order: image.order, productId: image.productId });
  }
  return Effect.gen(function* () {
    const images = yield* DB.try((db) =>
      db.select<{ image_order: number; product_id: string }[]>(
        "SELECT image_order, product_id FROM images WHERE image_id = $1",
        [id],
      ),
    );
    if (images.length === 0) return yield* NotFound.fail("Gambar tidak ditemukan");
    return { order: images[0].image_order, productId: images[0].product_id };
  });
}
