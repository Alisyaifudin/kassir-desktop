import { DB } from "../instance";
import { Effect } from "effect";
import { MethodFull, cache } from "./cache";

export function getAll() {
  return Effect.gen(function* () {
    const methods = cache.all();
    if (methods !== null) {
      return methods;
    }
    const res = yield* DB.try((db) =>
      db.select<DB.Method[]>(`SELECT * FROM methods ORDER BY method_id`),
    );
    const items: MethodFull[] = res.map((r) => ({
      id: r.method_id,
      kind: r.method_kind,
      name: r.method_name ?? undefined,
      deletedAt: r.method_deleted_at,
      syncAt: r.method_sync_at,
      updatedAt: r.method_updated_at,
    }));
    cache.set(items);
    return items;
  });
}
