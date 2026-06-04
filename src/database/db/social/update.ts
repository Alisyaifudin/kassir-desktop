import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function update(id: string, name: string, value: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE socials SET social_name = $1, social_value = $2, social_updated_at = $3, 
       social_sync_at = null WHERE social_id = $4`,
      [name, value, now, id],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, {
        name,
        value,
        syncAt: null,
        updatedAt: now,
        id,
      });
    }),
    Effect.asVoid,
  );
}
