import { Effect } from "effect";
import { DB } from "../instance";

export function delSync(id: string) {
  return DB.try((db) =>
    db.execute(
      `BEGIN;
       DELETE FROM socials WHERE social_id = $1;
       DELETE FROM graves WHERE grave_item_id = $1;
       COMMIT;`,
      [id],
    ),
  ).pipe(Effect.asVoid);
}
