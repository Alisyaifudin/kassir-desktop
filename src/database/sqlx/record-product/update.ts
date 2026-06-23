import { DB } from "../instance";
import { Effect } from "effect";

export function updateRecordProduct(id: string, eventId?: string) {
  const now = Date.now();
  return DB.execute(
    `BEGIN TRANSACTION;
UPDATE record_products SET product_event_id = $1 WHERE record_product_id = $2;
UPDATE records SET record_updated_at = $3, record_sync_at = NULL
WHERE record_id = (SELECT record_id FROM record_products WHERE record_product_id = $2);
COMMIT;`,
    [eventId ?? null, id, now],
  ).pipe(Effect.asVoid);
}
