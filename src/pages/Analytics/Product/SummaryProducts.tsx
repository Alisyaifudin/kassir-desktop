import Decimal from "decimal.js";
import { useMemo } from "react";
import { Show } from "~/components/Show";
import { ProductRecord } from "~/database/old/product";
import { useSize } from "~/hooks/use-size";
import { style } from "~/lib/style";

type Props = {
  products: ProductRecord[];
  mode: "sell" | "buy";
  start: number;
  end: number;
};

export function SummaryProduct({ products: all, mode, start, end }: Props) {
  const size = useSize();
  const products = useMemo(() => {
    const products: ProductRecord[] = [];
    for (const p of all) {
      if (p.timestamp < start || p.timestamp > end || p.mode !== mode) {
        continue;
      }
      const findIndex = products.findIndex((product) => product.id === p.id);
      if (findIndex === -1) {
        products.push({ ...p });
      } else {
        products[findIndex].qty += p.qty;
      }
    }
    return products;
  }, [start, end, mode, all]);
  return (
    <div style={style[size].text} className="flex flex-col gap-1">
      <p>Produk: {calcSum(products)}</p>
      <Show when={mode === "sell"}>
        <p>Untung: Rp{calcProfit(products).toLocaleString("id-ID")}</p>
      </Show>
    </div>
  );
}

function calcSum(products: ProductRecord[]): number {
  let val = new Decimal(0);
  for (const v of products) {
    val = val.add(v.qty);
  }
  return val.toNumber();
}

function calcProfit(products: ProductRecord[]): number {
  let val = new Decimal(0);
  for (const v of products) {
    let capital = new Decimal(v.capital);
    if (capital.comparedTo(0) === 0) {
      if (v.price < 15000) {
        capital = new Decimal(v.price).times(0.9);
      } else {
        capital = new Decimal(v.price).minus(5000);
      }
    }
    const profit = new Decimal(v.price).minus(capital);
    val = val.add(profit.times(v.qty));
  }
  return val.toNumber();
}
