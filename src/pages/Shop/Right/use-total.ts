import { store } from "@simplestack/store";
import { useEffect, useState } from "react";
import { useSubtotal } from "./use-subtotal";
import { useExtraTotal } from "./Extra/use-extras";
import { useStoreValue } from "@simplestack/store/react";
import Decimal from "decimal.js";

export const loadStore = store({
  item: false,
  extra: false,
});

export function useTotal() {
  const [total, setTotal] = useState<Decimal | undefined>(undefined);
  const { item, extra } = useStoreValue(loadStore);
  const subtotal = useSubtotal();
  const extraTotal = useExtraTotal();
  useEffect(() => {
    if (!item || !extra || subtotal === undefined) return;
    if (extraTotal !== undefined) {
      setTotal(new Decimal(extraTotal));
    } else {
      setTotal(subtotal);
    }
  }, [subtotal, extraTotal, item, extra]);
  return total;
}
