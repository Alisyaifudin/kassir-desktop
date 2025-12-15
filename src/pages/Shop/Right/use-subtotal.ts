import { productsStore } from "./Product/use-products";
import Decimal from "decimal.js";
import { useEffect } from "react";
import { createAtom } from "@xstate/store";
import { useAtom, useSelector } from "@xstate/store/react";

const subStore = createAtom(new Decimal(0));

// calc the total from items, including discounts
export function useSubtotal() {
  const products = useSelector(productsStore, (state) => state.context);
  const subtotal = useAtom(subStore);
  useEffect(() => {
    let subtotal = new Decimal(0);
    for (const product of products) {
      const totalDisc =
        product.discounts.length === 0 ? 0 : Decimal.sum(...product.discounts.map((d) => d.eff));
      const total = new Decimal(product.qty).times(product.price).minus(totalDisc);
      subtotal = subtotal.plus(total);
    }
    subStore.set(subtotal);
  }, [products]);
  return subtotal;
}
