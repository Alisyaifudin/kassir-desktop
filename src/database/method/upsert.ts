import { Effect } from "effect";
import { DB } from "../instance";
import { MethodFull, cache } from "./cache";

export function upsert({ id, kind, updatedAt, name }: Omit<MethodFull, "syncAt" | "deletedAt">) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO methods (method_id, method_name, method_kind, method_deleted_at, 
       method_updated_at, method_sync_at) VALUES ($1, $2, $3, null, $4, $5) 
       ON CONFLICT (method_id) DO UPDATE SET
       method_name = excluded.method_name,
       method_kind = excluded.method_kind,
       method_deleted_at = excluded.method_deleted_at,
       method_updated_at = excluded.method_updated_at,
       method_sync_at = excluded.method_sync_at`,
      [id, name, kind, updatedAt, now],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, {
        id,
        name,
        kind,
        deletedAt: null,
        updatedAt,
        syncAt: now,
      });
    }),
    Effect.asVoid,
  );
}
