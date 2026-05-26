import { Effect } from "effect";
import { DB } from "../instance";
import { updateCache } from "./cache";
import { produce } from "immer";

export function sync(productId: string, id: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute("UPDATE images SET images_sync_at = $1 WHERE image_id = $2 AND product_id = $3", [
      now,
      id,
      productId,
    ]),
  ).pipe(
    Effect.tap(() => {
      updateCache(
        productId,
        produce((draft) => {
          const idx = draft.findIndex((d) => d.id === id);
          if (idx === -1) return;
          draft[idx].syncAt = now;
        }),
      );
    }),
    Effect.asVoid,
  );
}
