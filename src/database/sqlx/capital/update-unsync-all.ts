import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllCapitals() {
  return DB.execute("UPDATE capitals SET capital_sync_at = null").pipe(Effect.asVoid);
}
