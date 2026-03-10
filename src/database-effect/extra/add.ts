import { getCache, setCache } from "./caches";
import { DB } from "../instance";
import { Effect } from "effect";

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
};

export function add({ name, value, kind }: Input) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.execute(`INSERT INTO extras (extra_name, extra_value, extra_kind) VALUES ($1, $2, $3)`, [
        name,
        value,
        kind,
      ]),
    );
    const id = res.lastInsertId;
    if (id === undefined) {
      setCache(null);
    } else {
      const cache = getCache();
      if (cache !== null) {
        setCache((prev) => [...prev, { id, name, value, kind }]);
      }
    }
  });
}
