import { DB } from "../instance";
import { Effect } from "effect";

type UnsyncProductEvent = {
  id: string;
  timestamp: number;
  value: number;
  capitalId: string;
  note: string;
};

export function getAllUnsyncProductEvent() {
  return DB.select<Omit<DB.ProductEvent, "product_event_sync_at">[]>(
    `SELECT product_event_id, timestamp, product_event_note, product_event_value, 
    capital_id FROM product_events WHERE product_event_sync_at IS NULL 
    ORDER BY timestamp`,
  ).pipe(
    Effect.map((res) =>
      res.map(
        ({ timestamp, product_event_value, product_event_note, product_event_id, capital_id }) =>
          ({
            id: product_event_id,
            value: product_event_value,
            capitalId: capital_id,
            timestamp,
            note: product_event_note,
          }) satisfies UnsyncProductEvent,
      ),
    ),
  );
}
