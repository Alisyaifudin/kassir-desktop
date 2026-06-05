import { Effect } from "effect";
import { DB } from "../instance";

export function deleteSocialById(id: string, now: number) {
  return DB.execute(
    `UPDATE socials SET social_deleted_at = $1, social_updated_at = $2,
     social_sync_at = null WHERE social_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
