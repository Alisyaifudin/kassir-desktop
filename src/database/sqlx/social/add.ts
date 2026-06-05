import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewSocial(name: string, value: string, now: number) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO socials (social_id, social_name, social_value, 
     social_updated_at, social_sync_at) VALUES ($1, $2, $3, $4, null)`,
    [id, name, value, now],
  ).pipe(Effect.as(id));
}
