import { extrasStore, useTotal } from "../../store/extra";
import { useFix } from "../../use-transaction";
import { useStatus } from "../../use-status";
import { useSelector } from "@xstate/store/react";
import { productsStore } from "../../store/product";

export function useChange(pay: number, rounding: number) {
  const total = useTotal();
  const fix = useFix();
  const grandTotal = total.plus(rounding);
  const change = Number(grandTotal.minus(pay).times(-1).toFixed(fix));
  const loading = useStatus() === "active";
  const productsLength = useSelector(productsStore, (state) => state.context.length);
  const extrasLength = useSelector(extrasStore, (state) => state.context.length);
  const disable = loading || (productsLength === 0 && extrasLength === 0);
  return { change, disable };
}
