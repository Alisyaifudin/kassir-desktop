import { useEffect, useState } from "react";
import { useSubtotal } from "./use-subtotal";
import { useExtraTotal } from "./Extra/use-extras";
import Decimal from "decimal.js";
import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";

export const loadStore = createAtom({
  product: false,
  extra: false,
});

export function useTotal() {
  const [total, setTotal] = useState<Decimal | undefined>(undefined);
  const { product, extra } = useAtom(loadStore);
  const subtotal = useSubtotal();
  const extraTotal = useExtraTotal();
  useEffect(() => {
    if (!product || !extra || subtotal === undefined) return;
    if (extraTotal !== undefined) {
      setTotal(new Decimal(extraTotal));
    } else {
      setTotal(subtotal);
    }
  }, [subtotal, extraTotal, product, extra]);
  return total;
}
