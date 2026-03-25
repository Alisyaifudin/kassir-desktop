import { db } from "~/database";
import { Result } from "~/lib/result";
import { useRange } from "../use-range";

const KEY = "money-detail";

export function useData(kindId: string) {
  const [range] = useRange();
  const [start, end] = range;
  const res = Result.use({
    fn: () => db.money.get.byRange(kindId, start, end),
    key: KEY,
    deps: [start, end],
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}
