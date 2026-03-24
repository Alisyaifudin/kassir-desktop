import { Effect } from "effect";
import { DB } from "../instance";
import { cache } from "./cache";

export function sync(id: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute("UPDATE customers SET customer_sync_at = $1 WHERE customer_id = $2", [now, id]),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, syncAt: now }));
    }),
    Effect.asVoid,
  );
}
