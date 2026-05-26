import { Effect } from "effect";
import { DB } from "../instance";

export function getUpdated(ids: string[]) {
  let bindingIndex = 1;
  const placeholders = ids.map(() => `$${bindingIndex++}`).join(", ");
  return DB.try((db) =>
    db.select<{ method_id: string; method_updated_at: number }[]>(
      `SELECT method_id, method_updated_at FROM methods WHERE method_id IN (${placeholders})`,
      ids,
    ),
  ).pipe(Effect.map((res) => new Map(res.map((r) => [r.method_id, r.method_updated_at]))));
}
