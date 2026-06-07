import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllMoney() {
  return DB.execute("UPDATE money SET money_sync_at = null").pipe(Effect.asVoid);
}
