import { DB } from "../instance";
import { Effect } from "effect";

export function getExtrasUpdatedAt(ids: string[]) {
  const placeholders = ids.map(() => `$`).join(", ");
  return DB.select<Pick<DB.Extra, "extra_updated_at" | "extra_id">[]>(
    `SELECT extra_updated_at, extra_id FROM extras 
    WHERE extra_deleted_at IS NULL AND extra_id IN (${placeholders})`,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.extra_id,
        updatedAt: r.extra_updated_at,
      })),
    ),
  );
}
