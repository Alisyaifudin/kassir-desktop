import { Effect } from "effect";
import { DB } from "../instance";
import { cache } from "./cache";

export function delById(id: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE methods SET method_deleted_at = $1, method_updated_at = $1 
       WHERE method_id = $2 AND method_name IS NOT NULL`,
      [now, id],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, deletedAt: now, updatedAt: now }));
    }),
    Effect.asVoid,
  );
}
