import { DB } from "../instance";
import { Effect } from "effect";
import { cache, type Social } from "./cache";

export function getAll() {
  return Effect.gen(function* () {
    const socials = cache.all();
    if (socials !== null) return socials;
    const res = yield* DB.try((db) => db.select<DB.Social[]>("SELECT * FROM socials"));
    const items: Social[] = res.map((r) => ({
      name: r.social_name,
      id: r.social_id,
      value: r.social_value,
    }));
    return items;
  });
}
