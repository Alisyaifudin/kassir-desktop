import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function update(id: string, name: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute("UPDATE methods SET method_name = $1, method_updated_at = $2 WHERE method_id = $3", [
      name,
      now,
      id,
    ]),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, name }));
    }),
    Effect.asVoid,
  );
}
