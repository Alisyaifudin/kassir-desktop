import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { cache } from "./cache";

export function delById(id: string) {
  const graveId = generateId();
  const now = Date.now();
  return DB.try((db) =>
    db.select<DB.Customer[]>(
      `DELETE FROM customers WHERE customer_id = $1;
       INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp)
       VALUES ($1, $2, 'customer', $3)
      `,
      [id, graveId, now],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
