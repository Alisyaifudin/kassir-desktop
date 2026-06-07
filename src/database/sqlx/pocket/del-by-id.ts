import { Effect } from "effect";
import { DB } from "../instance";

export function deletePocketById(id: string) {
  const now = Date.now();
  return DB.execute(
    `BEGIN TRANSACTION;
    UPDATE pocket SET pocket_updated_at = $1, pocket_deleted_at = $2, 
    pocket_sync_at = null WHERE pocket_id = $3;
    DELETE FROM money WHERE pocket_id = $4;
    COMMIT;`,
    [now, now, id, id],
  ).pipe(Effect.asVoid);
}
