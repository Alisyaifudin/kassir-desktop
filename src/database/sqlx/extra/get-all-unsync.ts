import { DB } from "../instance";
import { Effect } from "effect";

export function getAllUnsyncExtras() {
  return DB.select<DB.Extra[]>(
    "SELECT * FROM extras WHERE extra_sync_at IS NULL AND extra_deleted_at IS NULL",
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.extra_id,
        kind: r.extra_kind,
        name: r.extra_name,
        value: r.extra_value,
        updatedAt: r.extra_updated_at,
        syncAt: r.extra_sync_at ?? undefined,
      })),
    ),
  );
}
