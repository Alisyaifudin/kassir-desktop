import { DB } from "../instance";
import { Effect } from "effect";

export function update(id: number, name: string, phone: string) {
  return DB.try((db) =>
    db.execute(
      "UPDATE customers SET customer_name = $1, customer_phone = $2 WHERE customer_id = $3",
      [name, phone, id],
    ),
  ).pipe(Effect.asVoid);
}
