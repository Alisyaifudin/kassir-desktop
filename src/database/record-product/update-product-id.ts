import { DB } from "../instance";
import { Effect } from "effect";

export function updateProductId(recordProductId: string, productId: string | null) {
  return DB.try((db) =>
    db.execute("UPDATE record_products SET product_id = $1 WHERE record_product_id = $2", [
      productId,
      recordProductId,
    ]),
  ).pipe(Effect.asVoid);
}
