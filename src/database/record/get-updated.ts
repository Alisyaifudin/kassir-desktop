import { Effect } from "effect";
import { DB } from "../instance";

export function getUpdated(ids: string[]) {
  let bindingIndex = 1;
  const placeholders = ids.map(() => `$${bindingIndex++}`).join(", ");
  return DB.try((db) =>
    db.select<{ record_id: string; record_updated_at: number }[]>(
      `SELECT record_id, record_updated_at FROM records WHERE record_id IN (${placeholders})`,
      ids,
    ),
  ).pipe(Effect.map((res) => new Map(res.map((r) => [r.record_id, r.record_updated_at]))));
}
