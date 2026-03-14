import { Effect } from "effect";
import { DB } from "../instance";

export function incStock(id: number, qty: number) {
  return DB.try((db) =>
    db.execute("UPDATE products SET product_stock = product_stock + $1 WHERE product_id = $2", [
      qty,
      id,
    ]),
  ).pipe(Effect.asVoid);
}
