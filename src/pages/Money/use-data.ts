import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "money";

export function useData() {
  const res = Result.use({
    fn: () => db.money.get.allKind(),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}

export function revalidateMoney() {
  Result.revalidate(KEY);
}
