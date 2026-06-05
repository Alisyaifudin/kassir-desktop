import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllExtras() {
  return DB.execute("UPDATE extras SET extra_sync_at = null").pipe(Effect.asVoid);
}
