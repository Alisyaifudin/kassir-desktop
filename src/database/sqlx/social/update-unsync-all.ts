import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllSocials() {
  return DB.execute("UPDATE socials SET social_sync_at = null").pipe(Effect.asVoid);
}
