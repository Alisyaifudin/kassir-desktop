import { Effect } from "effect";
import { DB } from "../instance";

export function getCapitalId(id: string) {
  return DB.select<{ capital_id: string; product_event_value: number }[]>(
    `SELECT capital_id, product_event_value FROM product_events WHERE product_event_id = $1`,
    [id],
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({ capitalId: r.capital_id, value: r.product_event_value })),
    ),
  );
}
