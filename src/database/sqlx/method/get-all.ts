import { DB } from "../instance";
import { Effect } from "effect";

export function getAllMethods() {
  return DB.select<DBNamespace.Method[]>(
    "SELECT * FROM methods WHERE method_deleted_at IS NULL ORDER BY method_id",
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.method_id,
        kind: r.method_kind,
        name: r.method_name ?? undefined,
        label: r.method_label ?? undefined,
        syncAt: r.method_sync_at ?? undefined,
        updatedAt: r.method_updated_at,
      })),
    ),
  );
}
