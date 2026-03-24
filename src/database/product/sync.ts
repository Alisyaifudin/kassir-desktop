import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

export function sync(id: string) {
  return Effect.gen(function* () {
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(`UPDATE products SET product_sync_at = $1 WHERE product_id = $2`, [now, id]),
    );
    cache.update(id, (prev) => ({ ...prev, syncAt: now }));
  });
}
