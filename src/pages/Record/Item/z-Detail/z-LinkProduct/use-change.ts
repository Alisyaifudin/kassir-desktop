import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { RecordData } from "../../use-data";
import { Product } from "~/database/product/cache";
import { FuzzyResult } from "@nozbe/microfuzz";

export function useChange(
  product: RecordData["products"][number],
  products: Product[],
  search: (query: string) => FuzzyResult<Product>[],
) {
  const [query, setQuery] = useState("");
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
