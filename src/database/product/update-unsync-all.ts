import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

export function updateUnsyncAll() {
  return Effect.gen(function* () {
    yield* DB.try((db) => db.execute(`UPDATE products SET product_sync_at = null`));
    cache.updateAll((prev) => ({ ...prev, syncAt: null }));
  });
}
