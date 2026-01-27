import { DB } from "../instance";
import { Effect } from "effect";

export type Social = {
  id: number;
  name: string;
  value: string;
};

export function getAll() {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) => db.select<DB.Social[]>("SELECT * FROM socials"));
    const socials: Social[] = res.map((r) => ({
      name: r.social_name,
      id: r.social_id,
      value: r.social_value,
    }));
    return socials;
  });
}
