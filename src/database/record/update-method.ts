import { Effect } from "effect";
import { DB } from "../instance";

export function updateMethod(id: string, methodId: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE records SET method_id = $1, record_updated_at = $2, record_sync_at = null 
       WHERE record_id = $3`,
      [methodId, now, id],
    ),
  ).pipe(Effect.asVoid);
}
