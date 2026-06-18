import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyProductCodesSync(productId: string, codes: string[], now: number) {
  if (codes.length === 0) return Effect.void;
  let bindingIndex = 1;
  const placeholders = codes.map(() => `$${bindingIndex++}`).join(", ");
  const bindings: unknown[] = new Array(codes.length + 2);
  let i = 0;
  for (const code of codes) {
    bindings[i] = code;
    i++;
  }
  bindings[i] = now;
  bindings[i + 1] = productId;
  return DB.execute(
    `BEGIN TRANSACTION;
    DELETE FROM product_codes WHERE product_code IN (${placeholders});
    UPDATE products SET product_updated_at = $${bindingIndex++}, product_sync_at = null
    WHERE product_id = $${bindingIndex}
    COMMIT`,
    bindings,
  ).pipe(Effect.asVoid);
}
