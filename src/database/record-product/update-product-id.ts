import { DB } from "../instance";
import { Effect } from "effect";

export function updateProductId(recordProductId: string, productId: string | null) {
  return Effect.gen(function* () {
    const records = yield* DB.try((db) =>
      db.select<{ record_id: string }[]>(
        `SELECT record_id FROM record_products WHERE record_product_id = $1`,
        [recordProductId],
      ),
    );
    if (records.length === 0) return;
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(
        `UPDATE record_products SET product_id = $1 WHERE record_product_id = $2;\n
       UPDATE records SET record_updated_at = $3, record_sync_at = $4 WHERE record_id = $5`,
        [productId, recordProductId, now, null, records[0].record_id],
      ),
    );
  });
}
