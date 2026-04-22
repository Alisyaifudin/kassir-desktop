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
  if (events.length === 0) return Effect.void;
  let bindingIndex = 1;
  const placeholders = events
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = events.flatMap(({ createdAt, id, type, value }) => [
    id,
    createdAt,
    now,
    type,
    value,
    productId,
  ]);
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
             VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`,
        bindings,
      ),
    );
    yield* calcStock(productId);
  });
}
