import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewProductEvent({
  timestamp,
  value,
  capitalId,
  note,
}: {
  timestamp: number;
  value: number;
  capitalId: string;
  note: string;
}) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO product_events (product_event_id, timestamp, 
    product_event_note, product_event_value, capital_id) 
    VALUES ($1, $2, $3, $4, $5)`,
    [id, timestamp, note, value, capitalId],
  ).pipe(Effect.as(id));
}
