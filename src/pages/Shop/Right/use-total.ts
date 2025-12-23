import { useEffect, useState } from "react";
import { useSubtotal } from "./use-subtotal";
import { useExtraTotal } from "./Extra/use-extras";
import Decimal from "decimal.js";
import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";

export const loadingStore = createStore({
  context: {
    product: true,
    extra: true,
    transaction: true,
  },
  on: {
    setTransaction(context, event: { value: boolean }) {
      return { ...context, transaction: event.value };
    },
    setProduct(context, event: { value: boolean }) {
      return { ...context, product: event.value };
    },
    setExtra(context, event: { value: boolean }) {
      return { ...context, extra: event.value };
    },
  },
});

export function useTotal() {
  const [total, setTotal] = useState<Decimal | undefined>(undefined);
  const { product, extra, transaction } = useSelector(loadingStore, (state) => state.context);
  const subtotal = useSubtotal();
  const extraTotal = useExtraTotal();
  useEffect(() => {
    if (product || extra || transaction) return;
    if (extraTotal !== undefined) {
      setTotal(new Decimal(extraTotal));
    } else {
      setTotal(subtotal);
    }
  }, [subtotal, extraTotal, product, extra, transaction]);
  return total;
}
