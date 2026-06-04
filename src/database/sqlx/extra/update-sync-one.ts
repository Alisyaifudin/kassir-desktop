import { DB } from "../instance";
import { Effect } from "effect";

export function updateSyncOneExtra(id: string, now: number) {
  return DB.execute("UPDATE extras SET extra_sync_at = $1 WHERE extra_id = $2", [now, id]).pipe(
    Effect.asVoid,
  );
}
