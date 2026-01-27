import { DB } from "../instance";
import { Effect } from "effect";

export function del(name: string) {
  return DB.try((db) => db.execute("DELETE FROM cashiers WHERE cashier_name = $1", [name])).pipe(
    Effect.asVoid,
  );
}
