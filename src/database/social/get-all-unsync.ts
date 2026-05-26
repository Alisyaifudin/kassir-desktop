import { DB } from "../instance";
import { Effect } from "effect";
import { cache, type Social } from "./cache";

export function getAllUnsync() {
  return Effect.gen(function* () {
    const socials = cache.all();
    if (socials !== null) return socials.filter((s) => s.syncAt === null);
    const res = yield* DB.try((db) =>
      db.select<DB.Social[]>("SELECT * FROM socials WHERE social_sync_at IS NULL"),
    );
    const items: Social[] = res.map((r) => ({
      name: r.social_name,
      id: r.social_id,
      value: r.social_value,
    }));
    return items;
  });
}
