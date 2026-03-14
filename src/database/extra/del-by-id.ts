import { getCache, setCache } from "./caches";
import { DB } from "../instance";
import { Effect, pipe } from "effect";

export function delById(id: number) {
  return pipe(
    DB.try((db) => db.execute("DELETE FROM extras WHERE extra_id = $1", [id])),
    Effect.asVoid,
    Effect.tap(() => {
      const cache = getCache();
      if (cache !== null) {
        setCache((prev) => prev.filter((p) => p.id !== id));
      }
    }),
  );
}
