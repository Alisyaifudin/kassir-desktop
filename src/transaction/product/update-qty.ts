import { Effect } from "effect";
import { TX } from "../instance";

export function qty(id: string, qty: number) {
  return TX.try((tx) =>
    tx.execute("UPDATE products SET product_qty = $1 WHERE product_id = $2", [qty, id]),
  ).pipe(Effect.asVoid);
}
