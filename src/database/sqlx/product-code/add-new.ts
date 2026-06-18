import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewProductCode(productId: string) {
  const now = Date.now()
  const code = generateId();
  return DB.execute(
    `BEGIN TRANSACTION;
    INSERT INTO product_codes (product_code, product_id) 
    VALUES ($1, $2);
    UPDATE products SET product_updated_at = $3, product_sync_at = null
    WHERE product_id = $4
    COMMIT`,
    [code, productId, now, productId],
  ).pipe(Effect.as(code));
}
