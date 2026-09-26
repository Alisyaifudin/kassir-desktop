import { db } from "~/database";
import { Result } from "~/lib/result";

const KEY = "product";

export function useProduct(id: string) {
  const res = Result.use({
    fn: () => db.product.get.byId(id),
    key: KEY + id,
  });
  return res;
}
