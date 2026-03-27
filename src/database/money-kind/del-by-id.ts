import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function delById(id: string) {
  const graveId = generateId();
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `BEGIN;
       DELETE FROM money WHERE money_id = $1;
       INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp)
       VALUES ($1, $2, 'money_kind', $3);
       COMMIT;
    `,
      [id, graveId, now],
    ),
  ).pipe(Effect.asVoid);
}
