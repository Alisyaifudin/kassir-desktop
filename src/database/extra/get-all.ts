import { Effect } from "effect";
import { getCache, Extra, setCache } from "./caches";
import { DB } from "../instance";

export function all() {
  return Effect.gen(function* () {
    const cache = getCache();
    if (cache !== null) return cache;
    const res = yield* DB.try((db) =>
      db.select<DB.Extra[]>("SELECT extra_id, extra_name, extra_value, extra_kind FROM extras"),
    );
    const items: Extra[] = res.map((r) => ({
      id: r.extra_id,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
    }));
    setCache(items);
    return items;
  });
}
