import { Effect } from "effect";
import { DB } from "../instance";

export function deleteProductById(id: string, now: number) {
  return DB.execute(
    `
    BEGIN TRANSACTION;
    UPDATE products SET product_deleted_at = $1, product_updated_at = $1, 
    product_sync_at = null  WHERE product_id = $2;
    DELETE FROM product_codes WHERE product_id = $2;
    DELETE FROM capitals WHERE product_id = $2;
    COMMIT;
    `,
    [now, id],
  ).pipe(Effect.asVoid);
}
