import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function delById(id: string) {
  const now = Date.now();
  const graveId = generateId();
  return DB.try((db) =>
    db.execute(
      `BEGIN;
       DELETE FROM socials WHERE social_id = $1;
       INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp) 
       VALUES ($1, $2, 'social', $3);
       COMMIT;`,
      [id, graveId, now],
    ),
  ).pipe(Effect.asVoid);
}
