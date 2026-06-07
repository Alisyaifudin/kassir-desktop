import { Effect } from "effect";
import { DB } from "../instance";

export function updatePocketName({ id, name }: { id: string; name: string }, now: number) {
  return DB.execute(
    `UPDATE pockets SET pocket_name = $1, pocket_updated_at = $2, 
    pocket_sync_at = null WHERE pockeet_id = $3`,
    [name, now, id],
  ).pipe(Effect.asVoid);
}
