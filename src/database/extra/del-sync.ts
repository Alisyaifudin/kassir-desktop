import { cache } from "./cache";
import { DB } from "../instance";
import { Effect, pipe } from "effect";

export function delSync(id: string) {
  return pipe(
    DB.try((db) =>
      db.execute(
        `BEGIN;
         DELETE FROM extras WHERE extra_id = $1;
         DELETE FROM graves WHERE grave_item_id = $1 AND grave_kind = 'extra';
         COMMIT;`,
        [id],
      ),
    ),
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
