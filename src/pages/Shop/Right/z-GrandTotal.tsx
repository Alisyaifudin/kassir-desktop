import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";
import { useTotal } from "../store/extra";
import { useFix, useRounding } from "../use-transaction";

export function GrandTotal() {
  const size = useSize();
  const total = useTotal();
  const rounding = useRounding();
  const fix = useFix();
  const grandTotal = total.plus(rounding);
  return (
    <div className={cn("flex flex-col pb-5", css.grandTotal[size].container)}>
      <p className={cn("text-center", css.grandTotal[size].grandTotal)}>
        Rp{Number(grandTotal.toFixed(fix)).toLocaleString("id-ID")}
      </p>
    </div>
  );
}
