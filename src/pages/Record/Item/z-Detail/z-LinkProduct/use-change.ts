import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useProductSearch } from "~/hooks/use-product-search";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { RecordData } from "../../use-data";
import { Product } from "~/database/product/cache";

export function useChange(product: RecordData["products"][number], products: Product[]) {
  const [query, setQuery] = useState("");
  const search = useProductSearch(products);
  const [shownProducts, setShown] = useState<Product[]>([]);
  const selected =
    product.productId === undefined ? undefined : products.find((p) => p.id === product.productId);
  const debounced = useDebouncedCallback((value: string) => {
    if (value.trim() === "") {
      setShown([]);
    } else {
      const results = search(value.trim());
      setShown(results.map((r) => r.item));
    }
  }, DEBOUNCE_DELAY);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    setQuery(val);
    debounced(val);
  };
  return { query, handleChange, shownProducts, selected };
}
