import { Effect } from "effect";
import { db } from "~/database";
import { Result } from "~/lib/result";
import { dbExtrasStore } from "~/pages/Shop/store/db";

export function loadExtras() {
  return db.extra.get.all().pipe(
    Effect.tap((r) => {
      dbExtrasStore.set(r);
    }),
  );
}

const KEY = "extras-shop";

export function useFetchExtras() {
  const res = Result.use({
    fn: () => loadExtras(),
    key: KEY,
  });
  return res;
}
