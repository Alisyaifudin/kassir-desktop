import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewProductEvent({
  timestamp,
  type,
  value,
  capitalId,
}: {
  timestamp: number;
  type: DB.ProductEventEnum;
  value: number;
  capitalId: string;
}) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO product_events (product_event_id, timestamp, 
    product_event_type, product_event_value, capital_id) 
    VALUES ($1, $2, $3, $4, $5)`,
    [id, timestamp, type, value, capitalId],
  ).pipe(Effect.as(id));
}
