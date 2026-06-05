import { DB } from "../instance";
import { Effect } from "effect";

export function updateSocial(
  { id, name, value }: { id: string; name: string; value: string },
  now: number,
) {
  return DB.execute(
    `UPDATE socials SET social_name = $1, social_value = $2, social_updated_at = $3, 
     social_sync_at = null WHERE social_id = $4`,
    [name, value, now, id],
  ).pipe(Effect.asVoid);
}
