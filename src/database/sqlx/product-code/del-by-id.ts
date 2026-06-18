import { Effect } from "effect";
import { DB } from "../instance";

export function deleteProductCodeByCode(productId: string, code: string, now: number) {
  return DB.execute(
    `BEGIN TRANSACTION;
    DELETE FROM product_codes WHERE product_code = $1;
    UPDATE products SET product_updated_at = $2, product_sync_at = null
    WHERE product_id = $3
    COMMIT`,
    [code, now, productId],
  ).pipe(Effect.asVoid);
}
