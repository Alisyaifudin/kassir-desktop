import { Effect } from "effect";
import { DB } from "../instance";

export function deleteImageById(id: string, now: number) {
  return DB.execute(
    `UPDATE images SET image_updated_at = $1, image_deleted_at = $2, 
    image_sync_at = null WHERE image_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
