import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function add(name: string, phone: string) {
  const id = generateId();
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at) 
       VALUES ($1, $2, $3, $4, null)`,
      [id, name, phone, now],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, { id, name, phone, updatedAt: now, syncAt: null });
    }),
    Effect.as(id),
  );
}
