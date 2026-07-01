import { Effect } from "effect";
import { db } from "~/database";
import { Result } from "~/lib/result";
import { moneyKindAtom } from "./use-money";

const KEY = "money";

export function useData() {
  const res = Result.use({
    fn: () =>
      db.moneyKind.get.all().pipe(
        Effect.tap((res) => {
          moneyKindAtom.set(res);
        }),
      ),
    key: KEY,
  });
  return res;
}

export function revalidateMoney() {
  Result.revalidate(KEY);
}
