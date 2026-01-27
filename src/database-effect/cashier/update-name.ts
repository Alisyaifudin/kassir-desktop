import { Effect } from "effect";
import { DB } from "../instance";

export function updateName(name: { old: string; new: string }) {
  return DB.try((db) =>
    db.execute("UPDATE cashiers SET cashier_name = $1 WHERE cashier_name = $2", [
      name.new,
      name.old,
    ]),
  ).pipe(Effect.flatMap(() => Effect.void));
}
