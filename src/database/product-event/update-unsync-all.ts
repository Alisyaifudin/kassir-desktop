import { Effect } from "effect";
import { DB } from "../instance";

export function updateUnsyncAll() {
  return Effect.gen(function* () {
    yield* DB.try((db) => db.execute(`UPDATE product_events SET sync_at = null`));
  });
}
