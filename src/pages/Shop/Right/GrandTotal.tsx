import { cn } from "~/lib/utils";
import { useTotal } from "./use-total";
import { useFix, useRounding } from "../use-transaction";
import Decimal from "decimal.js";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";

export function GrandTotal() {
  const size = useSize();
  const total = useTotal();
  const rounding = useRounding();
  const fix = useFix();
  const grandTotal = total === undefined ? undefined : new Decimal(total).plus(rounding);
  return (
    <div className={cn("flex flex-col pb-5", css.grandTotal[size].container)}>
      <Show value={grandTotal}>
        {(grandTotal) => (
          <p className={cn("text-center", css.grandTotal[size].grandTotal)}>
            Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
          </p>
        )}
      </Show>
    </div>
  );
}
