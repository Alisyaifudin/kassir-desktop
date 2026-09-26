import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "extra-detail";

export function useData(id: string) {
  const res = Result.use({
    fn: () => db.extra.get.byId(id),
    key: KEY,
  });
  return res;
}
