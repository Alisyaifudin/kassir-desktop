import { Effect } from "effect";
import { TX } from "../instance";

export function name(id: string, name: string) {
  return TX.try((tx) =>
    tx.execute("UPDATE products SET product_name = $1 WHERE product_id = $2", [name, id]),
  ).pipe(Effect.asVoid);
}
