import { db } from "~/database-effect";
import { Result } from "~/lib/result";

const KEY = "customers";

export function useData() {
  const res = Result.use({
    fn: () => db.customer.getAll(),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
