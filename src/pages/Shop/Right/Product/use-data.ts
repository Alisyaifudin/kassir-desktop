import { Effect } from "effect";
import { Result } from "~/lib/result";
import { tx } from "~/transaction-effect";
import { transformProduct } from "../../store/product/transform-product";
import { productsStore } from "../../store/product";
import { useTab } from "../../use-tab";

export function useData() {
  const [tab] = useTab();
  const res = Result.use({
    fn: () => loader(tab),
    key: `product-list`,
    revalidateOn: {
      unmount: true,
    },
    deps: [tab],
  });
  return res;
}
function loader(tab?: number) {
  return Effect.gen(function* () {
    if (tab === undefined) return;
    const raw = yield* tx.product.getByTab(tab);
    const products = transformProduct(raw);
    productsStore.trigger.init({ products });
  });
}
