import { DB } from "../instance";
import { Effect } from "effect";

export function updateManyProductsSyncAt(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE products SET product_sync_at = $${bindingIndex++} WHERE product_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
