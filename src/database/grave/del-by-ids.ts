import { DB } from "../instance";
import { Effect } from "effect";

export function delByIds(ids: string[]) {
  if (ids.length === 0) return Effect.succeed(undefined);
  let bindingIndex = 1;
  const placeholders = ids.map(() => `$${bindingIndex++}`).join(", ");
  return DB.try((db) =>
    db.execute(`DELETE FROM graves WHERE grave_id IN (${placeholders})`, ids),
  ).pipe(Effect.asVoid);
}
