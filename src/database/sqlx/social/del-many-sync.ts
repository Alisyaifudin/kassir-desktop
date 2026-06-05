import { Effect } from "effect";
import { DB } from "../instance";

export function deleteManySocialsSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () => `UPDATE socials SET social_deleted_at = $${bindingIndex++}, 
     social_updated_at = $${bindingIndex++}, social_sync_at = $${bindingIndex++}
     WHERE social_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
