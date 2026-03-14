import { Item } from "~/database/product/get-by-range";
import { useQuery } from "./use-query";
import { useItemSearch } from "./use-search";
import { ProductTable } from "./z-ProductTable";

export function ProductList({ items: all }: { items: Item[] }) {
  const [query] = useQuery();
  const items = useItemSearch(all, query);
  return (
    <div className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <ProductTable items={items} />
      </div>
    </div>
  );
}
