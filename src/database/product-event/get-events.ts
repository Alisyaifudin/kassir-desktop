import { Effect } from "effect";
import { DB } from "../instance";

export type ProductEvent = {
  id: string;
  createdAt: number;
  type: DB.ProductEventEnum;
  value: number;
  productId: string;
};

const LIMIT = 1000;

export function getEvents(productId: string) {
  return DB.try((db) =>
    db.select<Omit<DB.ProductEvent, "sync_at">[]>(
      `SELECT id, created_at, type, value, product_id FROM product_events 
      WHERE product_id = $1 AND sync_at IS NULL LIMIT $2`,
      [productId, LIMIT],
    ),
  ).pipe(
    Effect.map((res) =>
      res.map(
        ({ product_id, created_at, ...r }) =>
          ({ ...r, productId: product_id, createdAt: created_at }) satisfies ProductEvent,
      ),
    ),
  );
}
