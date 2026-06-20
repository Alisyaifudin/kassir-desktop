import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllRecords() {
  return DB.execute("UPDATE records SET record_sync_at = null").pipe(Effect.asVoid);
}
