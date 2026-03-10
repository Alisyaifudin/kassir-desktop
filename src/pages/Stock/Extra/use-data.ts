import { Effect } from "effect";
import { db } from "~/database-effect";
import { Result } from "~/lib/result";
import { setLength } from "./use-length";

const KEY = "extras";

export function useData() {
  const res = Result.use({
    fn: () =>
      db.extra.get.all().pipe(
        Effect.tap((r) => {
          setLength(r.length);
          return r;
        }),
      ),
    key: KEY,
  });
  return res;
}

export function revalidateExtras() {
  Result.revalidate(KEY);
}
