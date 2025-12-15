import { capitalize, cn } from "~/lib/utils";
import { css } from "../style.css";
import { useTotal } from "./use-total";
import { useFix, useRounding } from "../use-transaction";
import Decimal from "decimal.js";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { auth } from "~/lib/auth";

export function GrandTotal() {
  const size = useSize();
  const username = auth.get()?.name ?? "admin";
  const total = useTotal();
  const rounding = useRounding();
  const fix = useFix();
  const grandTotal = total === undefined ? undefined : new Decimal(total).plus(rounding);
  return (
    <div className={cn("flex flex-col pb-5", css.grandTotal[size].container)}>
      <p className="px-2 text-end">Kasir: {capitalize(username)}</p>
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
