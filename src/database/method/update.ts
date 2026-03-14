import { DB } from "../instance";
import { Effect } from "effect";

export function update(id: number, name: string) {
  return DB.try((db) =>
    db.execute("UPDATE methods SET method_name = $1 WHERE method_id = $2", [name, id]),
  ).pipe(Effect.asVoid);
}
