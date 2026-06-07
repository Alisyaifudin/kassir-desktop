import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllMethods() {
  return DB.execute("UPDATE methods SET method_sync_at = null").pipe(Effect.asVoid);
}
