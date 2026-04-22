import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

export function updateSyncAt(id: string, timestamp?: number) {
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(`UPDATE products SET product_sync_at = $1 WHERE product_id = $2`, [timestamp ?? null, id]),
    );
    cache.update(id, (prev) => ({ ...prev, syncAt: timestamp ?? null }));
  });
}
