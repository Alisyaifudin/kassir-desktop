import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { cache } from "./cache";

export function add(name: string, value: string) {
  const id = generateId();
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO socials (social_id, social_name, social_value, 
       social_updated_at, social_sync_at) VALUES ($1, $2, $3, $4, null)`,
      [id, name, value, now],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, {
        id,
        name,
        value,
        syncAt: null,
        updatedAt: now,
      });
    }),
    Effect.asVoid,
  );
}
