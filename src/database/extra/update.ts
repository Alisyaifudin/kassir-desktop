import { Extra, getCache, setCache } from "./caches";
import { DB } from "../instance";
import { Effect } from "effect";

export function update({ id, kind, name, value }: Extra) {
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        "UPDATE extras SET extra_name = $1, extra_kind = $2, extra_value = $3 WHERE extra_id = $4",
        [name, kind, value, id],
      ),
    );
    const cache = getCache();
    if (cache !== null) {
      setCache((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return {
              id,
              kind,
              name,
              value,
            };
          }
          return p;
        }),
      );
    }
  });
}
