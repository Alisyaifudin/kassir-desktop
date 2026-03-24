import { Extra, cache } from "./cache";
import { DB } from "../instance";
import { Effect } from "effect";

export function update({ id, kind, name, value }: Extra) {
  const now = Date.now();
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        `UPDATE extras SET extra_name = $1, extra_kind = $2, extra_value = $3,
         extra_updated_at = $4, extra_sync_at = null WHERE extra_id = $5`,
        [name, kind, value, now, id],
      ),
    );
    cache.update(id, {
      id,
      kind,
      name,
      value,
      updatedAt: now,
      syncAt: null,
    });
  });
}
