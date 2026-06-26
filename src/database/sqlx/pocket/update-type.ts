import { Effect } from "effect";
import { DB } from "../instance";

export function updatePocketType(
  { id, type }: { id: string; type: DBNamespace.PocketType },
  now: number,
) {
  return DB.execute(
    `UPDATE pockets SET pocker_type = $1, pocket_updated_at = $2, 
    pocket_sync_at = null WHERE money_kind_id = $3`,
    [type, now, id],
  ).pipe(Effect.asVoid);
}
