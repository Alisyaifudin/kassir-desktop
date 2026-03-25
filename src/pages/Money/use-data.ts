import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "money";

export function useData() {
  const res = Result.use({
    fn: () => db.moneyKind.get.all(),
    key: KEY,
  });
  return res;
}

export function revalidateMoney() {
  Result.revalidate(KEY);
}
