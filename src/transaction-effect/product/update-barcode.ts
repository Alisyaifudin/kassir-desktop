import { Effect } from "effect";
import { TX } from "../instance";

export function barcode(id: string, barcode: string) {
  return TX.try((tx) =>
    tx.execute("UPDATE products SET product_barcode = $1 WHERE product_id = $2", [barcode, id]),
  ).pipe(Effect.asVoid);
}
