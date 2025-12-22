import { Item } from "~/database/product/get-by-range";
import { useQuery } from "./use-query";
import { useMode } from "./use-mode";
import { useItemSearch } from "./use-search";
import { ProductTable } from "./ProductTable";
import { useEffect } from "react";
import { useSummary } from "./Summary";

function estCapital(capital: number, price: number, qty: number, total: number): number {
  if (capital === 0) {
    if (price < 10000) {
      return 0.1 * price;
    } else {
      return 5000;
    }
  }
  return total - capital * qty;
}

export function ProductList({ items: all }: { items: Item[] }) {
  const [query] = useQuery();
  const [mode] = useMode();
  const items = useItemSearch(all, mode, query);
  const [, setSummary] = useSummary();
  useEffect(() => {
    let totalQty = 0;
    let profit = 0;
    const items = all.filter((a) => a.mode === mode);
    for (const item of items) {
      totalQty += item.qty;
      if (item.kind === "raw") {
        profit += estCapital(item.capital, item.price, item.qty, item.total);
        continue;
      }
      for (const it of item.items) {
        profit += estCapital(item.capital, it.price, it.qty, it.total);
      }
    }
    setSummary({ loading: false, product: totalQty, profit });
  }, [all]);
  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex-1 max-h-full overflow-hidden flex">
        <ProductTable items={items} />
      </div>
    </div>
  );
}
