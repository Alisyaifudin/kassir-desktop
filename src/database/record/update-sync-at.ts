import { Effect } from "effect";
import { DB } from "../instance";

export function updateSyncAt(id: string, syncAt: number) {
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(`UPDATE records SET record_sync_at = $1 WHERE record_id = $2`, [syncAt, id]),
    );
  });
}
