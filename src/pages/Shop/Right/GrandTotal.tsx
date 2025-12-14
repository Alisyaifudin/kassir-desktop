import { capitalize, cn } from "~/lib/utils";
import { css } from "../style.css";
import { useTotal } from "./use-total";
import { useStoreValue } from "@simplestack/store/react";
import { basicStore } from "../use-transaction";
import Decimal from "decimal.js";
import { Show } from "~/components/Show";
import { useSize } from "~/hooks/use-size";
import { useUser } from "~/hooks/use-user";

export function GrandTotal() {
  const size = useSize();
  const user = useUser();
  const total = useTotal();
  const rounding = useStoreValue(basicStore.select("rounding"));
  const fix = useStoreValue(basicStore.select("fix"));
  const grandTotal = total === undefined ? undefined : new Decimal(total).plus(rounding);
  return (
    <div className={cn("flex flex-col pb-5", css.grandTotal[size].container)}>
      <p className="px-2 text-end">Kasir: {capitalize(user.name)}</p>
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
