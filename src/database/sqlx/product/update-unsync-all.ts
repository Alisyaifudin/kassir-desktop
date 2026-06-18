import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllProducts() {
  return DB.execute("UPDATE products SET product_sync_at = null").pipe(Effect.asVoid);
}
