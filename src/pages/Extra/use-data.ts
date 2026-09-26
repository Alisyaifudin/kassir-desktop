import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "extras";

export function useData() {
  const res = Result.use({
    fn: () => db.extra.get.all(),
    key: KEY,
  });
  return res;
}

export function revalidateExtras() {
  Result.revalidate(KEY);
}
