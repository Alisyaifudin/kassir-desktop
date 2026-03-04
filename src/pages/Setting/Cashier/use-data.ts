import { db } from "~/database-effect";
import { Result } from "~/lib/result";

const KEY = "cashiers";

export function useData() {
  const res = Result.use({
    fn: () => db.cashier.get.all(),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
