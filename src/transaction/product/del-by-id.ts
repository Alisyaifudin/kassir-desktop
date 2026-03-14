import { Effect } from "effect";
import { TX } from "../instance";

export function delById(id: string) {
  return TX.try((tx) => tx.execute("DELETE FROM products WHERE product_id = $1", [id])).pipe(
    Effect.asVoid,
  );
}
