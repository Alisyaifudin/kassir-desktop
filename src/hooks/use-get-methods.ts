import { Effect } from "effect";
import { db } from "~/database";
import { Method } from "~/database/method/cache";
import { Result } from "~/lib/result";
import { store } from "~/store";

const loadMethod = db.method.get
  .all()
  .pipe(Effect.map((methods) => methods.filter(({ deletedAt }) => deletedAt === null)));

function loader() {
  const methods = Effect.all([loadMethod, store.method.get()], {
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
