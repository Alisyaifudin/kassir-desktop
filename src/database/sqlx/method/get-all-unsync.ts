import { DB } from "../instance";
import { Effect } from "effect";

export function getAllUnsyncMethods() {
  return DB.select<DB.Method[]>("SELECT * FROM methods WHERE method_sync_at IS NULL").pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.method_id,
        kind: r.method_kind,
        name: r.method_name ?? undefined,
        label: r.method_label ?? undefined,
        deletedAt: r.method_deleted_at ?? undefined,
        syncAt: r.method_sync_at ?? undefined,
        updatedAt: r.method_updated_at,
      })),
    ),
  );
}
