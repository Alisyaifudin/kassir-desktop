import { DB } from "../instance";
import { Effect } from "effect";

export function updateProductCode({ code, productId }: { code: string; productId: string }, now: number) {
  return DB.execute(
    `BEGIN TRANSACTION;
    UPDATE product_codes SET product_code = $1 WHERE product_id = $2; 
    UPDATE products SET product_updated_at = $3, product_sync_at = null
    WHERE product_id = $4;
    COMMIT;`,
    [code, productId, now, productId],
  ).pipe(Effect.asVoid);
}
