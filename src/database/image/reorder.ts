import { Effect } from "effect";
import { DB } from "../instance";
import { ImageFull, updateCache } from "./cache";

/**
 * Writes `orderedIds` as the new `image_order` (1-based) in a single transaction
 * and re-sorts the cached rows to match.
 *
 * Drag and drop hands over a whole permutation, so this rewrites the order instead
 * of trading places pairwise the way `swap` used to. That also retires two bugs it
 * had: it wrote `updated_at`, a column the table does not have, and it left the
 * cached array in its old order, which is what consumers read.
 */
export function reorder(productId: string, orderedIds: string[]) {
  if (orderedIds.length === 0) return Effect.void;
  const now = Date.now();
  const queries: string[] = [];
  const bindings: (string | number)[] = [];
  // `product_id` is the same in every statement, so it is bound once at the end
  const product = 3 * orderedIds.length + 1;
  for (let i = 0; i < orderedIds.length; i++) {
    queries.push(
      `UPDATE images SET image_order = $${1 + 3 * i}, image_sync_at = null, image_updated_at = $${2 + 3 * i}
       WHERE image_id = $${3 + 3 * i} AND product_id = $${product}`,
    );
    bindings.push(i + 1, now, orderedIds[i]);
  }
  return DB.try((db) =>
    db.execute(`BEGIN TRANSACTION;\n${queries.join(";\n")};\nCOMMIT;`, [...bindings, productId]),
  ).pipe(
    Effect.tap(() => {
      updateCache(productId, (prev) => reordered(prev, orderedIds, now));
    }),
    Effect.asVoid,
  );
}

/**
 * The cached rows renumbered to match `orderedIds`, so the array order and the
 * `image_order` values agree again. A row the caller did not mention is left with
 * the number it had and sorts after the ones that moved, rather than silently
 * taking a position this write never gave it.
 */
function reordered(prev: ImageFull[], orderedIds: string[], now: number) {
  const positions = new Map(orderedIds.map((id, i) => [id, i + 1]));
  return prev
    .map((row) => {
      const order = positions.get(row.id);
      if (order === undefined) return row;
      return { ...row, order, updatedAt: now, syncAt: null };
    })
    .sort((a, b) => a.order - b.order);
}
