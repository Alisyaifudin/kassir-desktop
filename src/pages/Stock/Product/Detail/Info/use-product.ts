import { db } from "~/database-effect";
import { Result } from "~/lib/result";

const KEY = "product";

export function useProduct(id: number) {
  const res = Result.use({
    fn: () => db.product.get.byId(id),
    key: KEY + id,
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}
