import { Effect } from "effect";
import { DB } from "../instance";

export function updateHash(name: string, hash: string) {
  return DB.try((db) =>
    db.execute("UPDATE cashiers SET cashier_hash = $1 WHERE cashier_name = $2", [hash, name]),
  ).pipe(Effect.asVoid);
}
