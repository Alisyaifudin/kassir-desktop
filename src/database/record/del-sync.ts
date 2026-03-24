import { Effect } from "effect";
import { DB } from "../instance";

export function delSync(id: string) {
  return DB.try((db) =>
    db.execute(
      `DELETE FROM records WHERE record_id = $1;\n
       DELETE FROM graves WHERE grave_item_id = $1;`,
      [id],
    ),
  ).pipe(Effect.asVoid);
}
