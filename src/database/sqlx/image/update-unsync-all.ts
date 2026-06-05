import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllImages() {
  return DB.execute("UPDATE images SET image_sync_at = null").pipe(Effect.asVoid);
}
