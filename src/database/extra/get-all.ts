import { Effect } from "effect";
import { cache, ExtraFull } from "./cache";
import { DB } from "../instance";

export function all() {
  return Effect.gen(function* () {
    const extras = cache.all();
    if (extras) {
      return extras;
    }
    const res = yield* DB.try((db) => db.select<DB.Extra[]>("SELECT * FROM extras"));
    const items: ExtraFull[] = res.map((r) => ({
      id: r.extra_id,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
      updatedAt: r.extra_updated_at,
      syncAt: r.extra_sync_at,
    }));
    cache.set(items);
    return items;
  });
}
