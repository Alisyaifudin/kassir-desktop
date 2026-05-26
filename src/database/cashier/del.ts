import { DB } from "../instance";
import { Effect } from "effect";

export function del(id: string) {
  return DB.try((db) => db.execute("DELETE FROM cashiers WHERE cashier_id = $1", [id])).pipe(
    Effect.asVoid,
  );
}
