import { DB } from "../instance";
import { Effect } from "effect";

export function getRecordsUpdatedAt(ids: string[]) {
  const placeholders = ids.map(() => `$`).join(", ");
  return DB.select<Pick<DB.Record, "record_updated_at" | "record_id">[]>(
    `SELECT record_updated_at, record_id FROM records 
    WHERE record_deleted_at IS NULL AND record_id IN (${placeholders})`,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.record_id,
        updatedAt: r.record_updated_at,
      })),
    ),
  );
}
