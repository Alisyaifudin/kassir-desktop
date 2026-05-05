import { DB } from "../instance";
import { productCache } from "./cache";
import { Effect } from "effect";

export function updateSyncAt(id: string, timestamp?: number) {
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(`UPDATE products SET product_sync_at = $1 WHERE product_id = $2`, [
        timestamp ?? null,
        id,
      ]),
    );
    productCache.update(id, (prev) => ({ ...prev, syncAt: timestamp ?? null }));
  });
}
