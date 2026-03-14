import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "extra-detail";

export function useData(id: number) {
  const res = Result.use({
    fn: () => db.extra.get.byId(id),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}
