import { DB } from "../instance";

export function getEvents(productId: string) {
  return DB.try((db) =>
    db.select<DB.ProductEvent[]>(
      `SELECT * FROM product_events WHERE product_id = $1 AND sync_at IS NULL ORDER BY created_at`,
      [productId],
    ),
  );
}
