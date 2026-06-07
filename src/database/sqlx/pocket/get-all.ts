import { Effect } from "effect";
import { DB } from "../instance";

export function getAllPocket() {
  return DB.select<DB.Pocket[]>(
    "SELECT * FROM pockets WHERE pocket_deleted_at IS NULL ORDER BY pocket_ordering",
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.pocket_id,
        name: r.pocket_name,
        type: r.pocket_type,
        ordering: r.pocket_ordering,
        updatedAt: r.pocket_updated_at,
        syncAt: r.pocket_sync_at ?? undefined,
      })),
    ),
  );
}
