import { Effect } from "effect";
import { DB } from "../instance";

export function delById(id: number) {
  return DB.try((db) =>
    db.execute("UPDATE methods SET method_deleted_at = $1 WHERE method_id = $2", [Date.now(), id]),
  ).pipe(Effect.asVoid);
}
