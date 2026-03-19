import { Effect } from "effect";
import { DB } from "../instance";

export function updateHash(id: string, hash: string) {
  return DB.try((db) =>
    db.execute("UPDATE cashiers SET cashier_hash = $1 WHERE cashier_id = $2", [hash, id]),
  ).pipe(Effect.asVoid);
}
