import { Effect } from "effect";
import { DB } from "../instance";
import { cache } from "./cache";

export function delSync(id: string) {
  return DB.try((db) =>
    db.select<DB.Customer[]>(
      `BEGIN;
       DELETE FROM customers WHERE customer_id = $1;
       DELETE FROM graves WHERE grave_item_id = $1 AND grave_kind = 'customer';
       COMMIT;`,
      [id],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.delete(id);
    }),
    Effect.asVoid,
  );
}
