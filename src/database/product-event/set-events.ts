import { Effect } from "effect";
import { DB } from "../instance";
import { calcStock } from "../product/calc-stock";

type Input = {
  id: string;
  createdAt: number;
  type: DB.ProductEventEnum;
  value: number;
};

export function setEvents(productId: string, events: Input[]) {
  const now = Date.now();
  return Effect.gen(function* () {
    yield* Effect.all(
      events.map(({ id, createdAt, type, value }) =>
        DB.try((db) =>
          db.execute(
            `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET
             created_at = excluded.created_at,
             sync_at = excluded.sync_at,
             type = excluded.type,
             value = excluded.value,
             product_id = excluded.product_id`,
            [id, createdAt, now, type, value, productId],
          ),
        ),
      ),
      { concurrency: 10 },
    );
    yield* calcStock(productId);
  });
}
