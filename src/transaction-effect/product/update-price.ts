import { Effect } from "effect";
import { TX } from "../instance";

export function price(id: string, price: number) {
  return TX.try((tx) =>
    tx.execute("UPDATE products SET product_price = $1 WHERE product_id = $2", [price, id]),
  ).pipe(Effect.asVoid);
}
