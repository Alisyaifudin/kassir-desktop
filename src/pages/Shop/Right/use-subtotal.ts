import { useStoreValue } from "@simplestack/store/react";
import { productsStore } from "./Product/use-products";
import Decimal from "decimal.js";
import { store } from "@simplestack/store";
import { useEffect } from "react";

const subStore = store(new Decimal(0));

// calc the total from items, including discounts
export function useSubtotal() {
  const items = useStoreValue(productsStore);
  const subtotal = useStoreValue(subStore);
  useEffect(() => {
    let subtotal = new Decimal(0);
    for (const item of items) {
      const discEff = item.discEff;
      if (discEff === undefined) return undefined;
      const total = new Decimal(item.subtotal).minus(discEff);
      subtotal = subtotal.plus(total);
    }
    subStore.set(subtotal);
  }, [items]);
  return subtotal;
}
