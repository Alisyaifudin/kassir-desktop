import { Effect } from "effect";
import { DB } from "../instance";

export function updateSyncAt(eventId: string, timestamp: number) {
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(`UPDATE product_events SET sync_at = $1 WHERE id = $2`, [timestamp, eventId]),
    );
  });
}
