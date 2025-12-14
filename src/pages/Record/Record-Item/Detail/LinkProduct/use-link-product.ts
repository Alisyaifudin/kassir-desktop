import { useState } from "react";
import { useSubmit } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { useProductSearch } from "~/hooks/use-product-search-fuzzysort";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useLinkProduct(item: DB.RecordItem, products: DB.Product[]) {
  const [query, setQuery] = useState("");
  const { search } = useProductSearch();
  const [shownProducts, setShown] = useState<DB.Product[]>([]);
  const selected =
    item.product_id === null ? undefined : products.find((p) => p.id === item.product_id);
  const debounced = useDebouncedCallback((value: string) => {
    if (value.trim() === "") {
      setShown([]);
    } else {
      new Promise((resolve) => {
        const results = search(value.trim(), products);
        resolve(results);
      }).then((v) => setShown(v as any));
    }
  }, DEBOUNCE_DELAY);
  const submit = useSubmit();
  const handleClick = (itemId: number, productId: number) => async () => {
    const formdata = new FormData();
    formdata.set("action", "link-product");
    formdata.set("item-id", itemId.toString());
    formdata.set("product-id", productId.toString());
    submit(formdata, { method: "POST" });
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    setQuery(val);
    debounced(val);
  };
  return { query, handleChange, shownProducts, handleClick, selected };
}
