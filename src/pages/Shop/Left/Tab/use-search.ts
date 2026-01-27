import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useProductSearch } from "~/hooks/use-product-search";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useExtraSearch } from "~/hooks/use-extra-search";
import { basicStore } from "../../use-transaction";
import { productsStore } from "../../Right/Product/use-products";
import { extrasStore } from "../../Right/Extra/use-extras";
import { generateId } from "~/lib/random";
import { Product } from "~/database/product/caches";
import { Extra } from "~/database/extra/caches";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction";
import { useTab } from "../../use-tab";
import { useAtom } from "@xstate/store/react";
import { useSubtotal } from "../../Right/use-subtotal";
import { extrasDB, productsDB } from "../use-load-db";
import { FuzzyResult } from "@nozbe/microfuzz";

function setQuery(query: string) {
  basicStore.set((prev) => ({ ...prev, query }));
}

function useQuery() {
  const value = useAtom(basicStore, (state) => state.query);
  return value;
}

export function useSearch() {
  const ref = useRef<HTMLInputElement>(null);
  const [tab] = useTab();
  const query = useQuery();
  const [products, setProducts] = useState<FuzzyResult<Product>[]>([]);
  const [extras, setExtras] = useState<FuzzyResult<Extra>[]>([]);
  const subtotal = useSubtotal();
  const allProducts = useAtom(productsDB);
  const allExtras = useAtom(extrasDB);
  const searchProduct = useProductSearch(allProducts);
  const searchExtra = useExtraSearch(allExtras);
  const debounced = useDebouncedCallback((value: string) => {
    if (tab === undefined) return;
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
  }, [query]);
  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value.trimStart();
    setQuery(val);
    setError("");
  };

  const handleClickProduct = async (product: Product) => {
    if (ref.current === null || tab === undefined) return;
    setProducts([]);
    setExtras([]);
    setQuery("");
    setError("");
    queue.add(() => tx.transaction.update.query(tab, ""));
    ref.current.focus();
    const id = generateId();
    const storedProducts = productsStore.get().context;
    const found = storedProducts.find(
      (s) => s.barcode === product.barcode && s.barcode.trim() !== "",
    );
    if (found === undefined) {
      productsStore.trigger.addProduct({
        product: {
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
          },
          barcode: product.barcode ?? "",
          discounts: [],
          id,
          name: product.name,
          price: product.price,
          qty: 1,
          stock: product.stock,
          tab,
          total: product.price,
        },
      });
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
    } else {
      productsStore.trigger.updateProduct({
        id: found.id,
        recipe: (draft) => {
          draft.qty += 1;
        },
      });
      queue.add(() => tx.product.update.qty(found.id, found.qty + 1));
    }
  };
  const handleClickExtra = (extra: Extra) => {
    if (ref.current === null || tab === undefined) return;
    setProducts([]);
    setExtras([]);
    setQuery("");
    setError("");
    queue.add(() => tx.transaction.update.query(tab, ""));
    ref.current.focus();
    const id = generateId();
    extrasStore.trigger.add({
      extra: {
        id,
        kind: extra.kind,
        name: extra.name,
        saved: false,
        tab,
        value: extra.value,
        extraId: extra.id,
      },
      subtotal,
    });
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
    const productWithBarcode = allProducts.find((p) => p.barcode === query.trim());
    if (productWithBarcode !== undefined) {
      handleClickProduct({
        barcode: productWithBarcode.barcode,
        name: productWithBarcode.name,
        price: productWithBarcode.price,
        id: productWithBarcode.id,
        stock: productWithBarcode.stock,
        capital: productWithBarcode.capital,
      });
      return;
    }
    const extraMatch = allExtras.find((p) => p.name.toLowerCase() === query.toLowerCase().trim());
    if (extraMatch !== undefined) {
      handleClickExtra({
        kind: extraMatch.kind,
        name: extraMatch.name,
        value: extraMatch.value,
        id: extraMatch.id,
      });
      return;
    }
    const product = products.at(0);
    const extra = extras.at(0);
    if (product !== undefined && extra !== undefined) {
      if (product.score >= extra.score) {
        handleClickProduct({
          barcode: product.item.barcode,
          name: product.item.name,
          price: product.item.price,
          id: product.item.id,
          stock: product.item.stock,
          capital: product.item.capital,
        });
        return;
      }
      handleClickExtra({
        kind: extra.item.kind,
        name: extra.item.name,
        value: extra.item.value,
        id: extra.item.id,
      });
      return;
    }
    if (product !== undefined) {
      handleClickProduct({
        barcode: product.item.barcode,
        name: product.item.name,
        price: product.item.price,
        id: product.item.id,
        stock: product.item.stock,
        capital: product.item.capital,
      });
      return;
    }
    if (extra !== undefined) {
      handleClickExtra({
        kind: extra.item.kind,
        name: extra.item.name,
        value: extra.item.value,
        id: extra.item.id,
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
