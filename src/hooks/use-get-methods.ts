import { Effect } from "effect";
import { db } from "~/database-effect";
import { Method } from "~/database-effect/method/get-all";
import { Result } from "~/lib/result";
import { store } from "~/store-effect";

function loader() {
  const methods = Effect.all([db.method.getAll(), store.method.get()], {
    concurrency: "unbounded",
  });
  return methods;
}

const KEY = "methods";

export function useGetMethods(cb?: (methods: Method[]) => void) {
  const res = Result.use({
    fn: () =>
      loader().pipe(
        Effect.tap(([methods]) => {
          cb?.(methods);
        }),
      ),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
