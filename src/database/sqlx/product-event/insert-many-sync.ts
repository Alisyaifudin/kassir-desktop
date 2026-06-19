import { DB } from "../instance";
import { Effect } from "effect";

export function insertManyProductEventSync(
  productEvents: {
    id: string;
    capitalId: string;
    value: number;
    timestamp: number;
    note: string;
  }[],
) {
  let bindingIndex = 1;
  const placeholders = productEvents
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = productEvents.flatMap(({ id, capitalId, note, value, timestamp }) => [
    id,
    timestamp,
    value,
    null,
    note,
    capitalId,
  ]);
  return DB.execute(
    `INSERT INTO product_events (product_event_id, timestamp, product_event_value,
    product_event_sync_at, product_event_note, capital_id)
    VALUES ${placeholders} ON CONFLICT (product_event_id) DO NOTHING`,
    bindings,
  ).pipe(Effect.as(productEvents.map((event) => event.id)));
}
