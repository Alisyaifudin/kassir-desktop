import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useProductSearch } from "~/hooks/use-product-search";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useExtraSearch } from "~/hooks/use-extra-search";
import { useStoreValue } from "@simplestack/store/react";
import { basicStore } from "../../use-transaction";
import { productsStore } from "../../Right/Product/use-products";
import { extrasStore } from "../../Right/Extra/use-extras";
import { generateId } from "~/lib/random";
import { Product } from "~/database/product/caches";
import { Extra } from "~/database/extra/caches";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction";
import { produce } from "immer";
import { useTab } from "../../use-tab";

const queryStore = basicStore.select("query");

function useQuery() {
  const value = useStoreValue(queryStore);
  const setValue = queryStore.set;
  return [value, setValue] as const;
}

export function useSearch(allProducts: Product[], allExtras: Extra[]) {
  const ref = useRef<HTMLInputElement>(null);
  const [tab] = useTab();
  const [query, setQuery] = useQuery();
  const [products, setProducts] = useState<Product[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const searchProduct = useProductSearch(allProducts);
  const searchExtra = useExtraSearch(allExtras);
  const debounced = useDebouncedCallback((value: string) => {
    if (value.trim() === "") {
      setProducts([]);
      setExtras([]);
    } else {
      const products = searchProduct(value.trim());
      const extras = searchExtra(value.trim());
      setProducts(products);
      setExtras(extras);
    }
    queue.add(() => tx.transaction.update.query(tab, value));
  }, DEBOUNCE_DELAY);
  const [error, setError] = useState("");
  useEffect(() => {
    debounced(query);
  }, []);
  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value.trimStart();
    setQuery(val);
    setError("");
    debounced(val);
  };

  const handleClickProduct = async (product: Product) => {
    if (ref.current === null) return;
    setProducts([]);
    setExtras([]);
    setQuery("");
    setError("");
    queue.add(() => tx.transaction.update.query(tab, ""));
    ref.current.focus();
    const id = generateId();
    productsStore.set(
      produce((draft) => {
        draft.push({
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
          },
          discEff: 0,
          barcode: product.barcode ?? "",
          discounts: [],
          id,
          name: product.name,
          price: product.price,
          qty: 1,
          stock: product.stock,
          subtotal: product.price,
          tab,
        });
      }),
    );
    queue.add(() =>
      tx.product.add({
        id,
        tab,
        price: product.price,
        name: product.name,
        barcode: product.barcode ?? "",
        qty: 1,
        stock: product.stock,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      }),
    );
  };
  const handleClickExtra = (extra: Extra) => {
    if (ref.current === null) return;
    setProducts([]);
    setExtras([]);
    setQuery("");
    setError("");
    queue.add(() => tx.transaction.update.query(tab, ""));
    ref.current.focus();
    const id = generateId();
    extrasStore.set(
      produce((draft) => {
        draft.push({
          id,
          kind: extra.kind,
          name: extra.name,
          saved: false,
          tab,
          value: extra.value,
          extraId: extra.id,
        });
      }),
    );
    queue.add(() =>
      tx.extra.add({
        tab,
        id,
        name: extra.name,
        value: extra.value,
        kind: extra.kind,
        saved: false,
      }),
    );
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (error !== "" || query.trim() === "") {
      return;
    }
    const product = allProducts.find((p) => p.barcode === query.trim()) ?? products.at(0);
    const extra =
      allExtras.find((p) => p.name.toLowerCase() === query.toLowerCase().trim()) ?? extras.at(0);
    if (product !== undefined) {
      handleClickProduct({
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        id: product.id,
        stock: product.stock,
      });
      return;
    }
    if (extra !== undefined) {
      handleClickExtra({
        kind: extra.kind,
        name: extra.name,
        value: extra.value,
        id: extra.id,
      });
      return;
    }
    setError("Barang tidak ditemukan");
  };
  return {
    query,
    products,
    extras,
    handleChange: handleChangeInput,
    handleClickProduct,
    handleClickExtra,
    handleSubmit,
    error,
    ref,
  };
}
