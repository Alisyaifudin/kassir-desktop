import { Effect } from "effect";
import { cache } from "./cache";
import { DB } from "../instance";

export function allUnsync() {
  return Effect.gen(function* () {
    const extras = cache.all();
    if (extras) {
      return extras.filter((e) => e.syncAt === null);
    }
    const res = yield* DB.try((db) =>
      db.select<DB.Extra[]>("SELECT * FROM extras WHERE extra_sync_at IS NULL"),
    );
    return res.map((r) => ({
      id: r.extra_id,
      kind: r.extra_kind,
      name: r.extra_name,
      value: r.extra_value,
      updatedAt: r.extra_updated_at,
    }));
  });
}
