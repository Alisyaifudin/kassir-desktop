import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyProductsSync(deleted: { id: string; deletedAt: number }[], now: number) {
  if (deleted.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = deleted.map(
    () =>
      `
      UPDATE products SET product_deleted_at = $${bindingIndex++}, product_updated_at = $${bindingIndex++}, 
      product_sync_at = null  WHERE product_id = $${bindingIndex++};
      DELETE FROM product_codes WHERE product_id = $${bindingIndex++};
      DELETE FROM capitals WHERE product_id = $${bindingIndex++};
      `,
  );
  const bindings = deleted.flatMap(({ id, deletedAt }) => [deletedAt, deletedAt, now, id, id, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
