import { DB } from "../instance";
import { productCache } from "./cache";
import { Effect } from "effect";

export function updateUnsyncAll() {
  return Effect.gen(function* () {
    yield* DB.try((db) => db.execute(`UPDATE products SET product_sync_at = null`));
    productCache.updateAll((prev) => ({ ...prev, syncAt: null }));
  });
}
