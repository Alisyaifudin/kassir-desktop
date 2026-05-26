import { Effect } from "effect";
import { DB } from "../instance";

export function sync(id: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute("UPDATE money_kind SET money_kind_sync_at = $1 WHERE money_kind_id = $2", [now, id]),
  ).pipe(
    Effect.asVoid,
  );
}
