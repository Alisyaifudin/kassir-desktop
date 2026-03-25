import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

export function updateStock(id: string, stock: number) {
  const now = Date.now();
  const eventId = generateId();
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        `UPDATE products SET product_stock = $1 WHERE product_id = $2;
         INSERT product_events (id, created_at, type, value, product_id) 
         VALUES ($3, $4, $5, $6)`,
        [stock, id, eventId, now, "manual", stock, id],
      ),
    );
    cache.update(id, (prev) => ({
      ...prev,
      stock,
      id,
    }));
  });
}
