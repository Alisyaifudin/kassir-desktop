import { Effect } from "effect";
import { DB } from "../instance";

export function updateName(id: string, name: string) {
  return DB.try((db) =>
    db.execute("UPDATE cashiers SET cashier_name = $1 WHERE cashier_id = $2", [name, id]),
  ).pipe(Effect.flatMap(() => Effect.void));
}
