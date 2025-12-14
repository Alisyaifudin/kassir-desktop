import { useStoreValue } from "@simplestack/store/react";
import { basicStore } from "../../use-transaction";
import { memo, useEffect } from "react";
import { Show } from "~/components/Show";
import Decimal from "decimal.js";
import { updateProduct } from "./use-products";

export const Total = memo(
  ({
    id,
    discEff,
    subtotal,
    price,
    qty,
  }: {
    id: string;
    discEff?: number;
    subtotal: number;
    price: number;
    qty: number;
  }) => {
    const fix = useStoreValue(basicStore.select("fix"));
    useEffect(() => {
      updateProduct(id, (draft) => {
        draft.subtotal = new Decimal(price).times(qty).toNumber();
      });
    }, [price, qty]);
    const total = discEff === undefined ? undefined : new Decimal(subtotal).minus(discEff);
    return (
      <Show value={total}>
        {(total) => <p>{Number(total.toFixed(fix)).toLocaleString("id-ID")}</p>}
      </Show>
    );
  },
);
