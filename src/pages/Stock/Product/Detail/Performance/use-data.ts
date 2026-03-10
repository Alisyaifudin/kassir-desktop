import { Result } from "~/lib/result";
import { db } from "~/database-effect";
import { useBound } from "./use-bound";
import { Effect } from "effect";

const KEY = "performance";

export function useData(id: number) {
  const [start, end] = useBound();
  const res = Result.use({
    fn: () => Effect.all([db.product.get.historyRange(id, start, end), db.product.get.byId(id)]),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
    deps: [start, end],
  });
  return res;
}
