import { Effect } from "effect";
import { cache } from "./cache";
import { produce } from "immer";
import { sqlx } from "~/database/sqlx";

export function updateSyncManyImages(ids: string[], now: number) {
  return Effect.gen(function* () {
    const productIds = yield* sqlx.image.get.productId.many(ids);
    yield* sqlx.image.sync.update.many.syncAt(ids, now);
    productIds.forEach(({ productId, id }) =>
      cache.update(
        productId,
        produce((draft) => {
          const idx = draft.findIndex((d) => d.id === id);
          if (idx === -1) return;
          draft[idx].syncAt = now;
        }),
      ),
    );
  });
}
