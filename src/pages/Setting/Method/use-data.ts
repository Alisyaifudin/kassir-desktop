import { Effect } from "effect";
import { db } from "~/database-effect";
import { Result } from "~/lib/result";
import { store } from "~/store-effect";

function loader() {
  const methods = Effect.all([db.method.getAll(), store.method.get()], {
    concurrency: "unbounded",
  });
  return methods;
}

const KEY = "methods";

export function useData() {
  const res = Result.use({
    fn: () => loader(),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
