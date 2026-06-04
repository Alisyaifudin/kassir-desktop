import { Effect } from "effect";
import { DB } from "../instance";

export function deleteExtraById(id: string, now: number) {
  return DB.execute(
    `UPDATE extras SET extra_deleted_at = $1, extra_updated_at = $2, extra_sync_at = null WHERE extra_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
