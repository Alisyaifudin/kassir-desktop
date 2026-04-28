import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAll() {
  return Effect.gen(function* () {
    yield* DB.try((db) => db.execute(`UPDATE methods SET method_sync_at = null`));
  });
}
