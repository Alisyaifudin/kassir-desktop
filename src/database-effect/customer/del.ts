import { Effect } from "effect";
import { DB } from "../instance";

export function delById(id: number) {
  return DB.try((db) =>
    db.select<DB.Customer[]>("DELETE FROM customers WHERE customer_id = $1", [id]),
  ).pipe(Effect.asVoid);
}
