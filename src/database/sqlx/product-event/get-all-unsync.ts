import { DB } from "../instance";
import { Effect } from "effect";

type UnsyncProductEvent = {
  id: string;
  timestamp: number;
  type: DB.ProductEventEnum;
  value: number;
  capitalId: string;
};

export function getAllUnsyncProductEvent() {
  return DB.select<Omit<DB.ProductEvent, "product_event_sync_at">[]>(
    `SELECT product_event_id, timestamp, product_event_type, product_event_value, 
    capital_id FROM product_events WHERE product_event_sync_at IS NULL 
    ORDER BY timestamp`,
  ).pipe(
    Effect.map((res) =>
      res.map(
        ({ timestamp, product_event_value, product_event_id, product_event_type, capital_id }) =>
          ({
            id: product_event_id,
            value: product_event_value,
            capitalId: capital_id,
            type: product_event_type,
            timestamp,
          }) satisfies UnsyncProductEvent,
      ),
    ),
  );
}
