import { cache } from "./cache";
import { DB } from "../instance";
import { Effect, pipe } from "effect";
import { generateId } from "~/lib/random";

export function delById(id: string) {
  const graveId = generateId();
  const now = Date.now();
  return pipe(
    DB.try((db) =>
      db.execute(
        `BEGIN;
         DELETE FROM extras WHERE extra_id = $1;
         INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp)
         VALUES ($1, $2, 'extra', $3);
         COMMIT;`,
        [id, graveId, now],
      ),
    ),
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
