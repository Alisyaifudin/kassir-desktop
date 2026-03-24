import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function sync(id: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(`UPDATE socials SET social_sync_at = $1 WHERE social_id = $2`, [now, id]),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, syncAt: now }));
    }),
    Effect.asVoid,
  );
}
