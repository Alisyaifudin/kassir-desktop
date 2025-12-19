import { useState } from "react";
import { useSubmit } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { useProductSearch } from "~/hooks/use-product-search";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { Data } from "../../loader";
import { Product } from "~/database/product/caches";

export function useLinkProduct(product: Data["products"][number], products: Product[]) {
  const [query, setQuery] = useState("");
  const search = useProductSearch(products);
  const [shownProducts, setShown] = useState<Product[]>([]);
  const selected =
    product.productId === undefined ? undefined : products.find((p) => p.id === product.productId);
  const debounced = useDebouncedCallback((value: string) => {
    if (value.trim() === "") {
      setShown([]);
    } else {
      new Promise((resolve) => {
        const results = search(value.trim());
        resolve(results);
      }).then((v) => setShown(v as any));
    }
  }, DEBOUNCE_DELAY);
  const submit = useSubmit();
  const handleClick = (recordProductId: number, productId: number) => async () => {
    const formdata = new FormData();
    formdata.set("action", "link-product");
    formdata.set("record-product-id", recordProductId.toString());
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
