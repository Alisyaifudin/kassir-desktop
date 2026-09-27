import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useProductSearch } from "~/hooks/use-product-search";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { generateId } from "~/lib/random";
import { Product } from "~/database/product/cache";
import { tx } from "~/transaction";
import { useAtom } from "@xstate/store/react";
import { FuzzyResult } from "@nozbe/microfuzz";
import { basicStore } from "../../../use-transaction";
import { productsStore } from "../../../store/product";
import { useTab } from "../../../use-tab";
import { queue } from "../../../util-queue";

function setQuery(query: string) {
  basicStore.set((prev) => ({ ...prev, query }));
}

function useQuery() {
  const value = useAtom(basicStore, (state) => state.query);
  return value;
}

export function useSearch(allProducts: Product[]) {
  const ref = useRef<HTMLInputElement>(null);
  const [tab] = useTab();
  const query = useQuery();
  const [products, setProducts] = useState<FuzzyResult<Product>[]>([]);
  const searchProduct = useProductSearch(allProducts);
  const debounced = useDebouncedCallback((value: string) => {
    console.log({ value });
    if (value.trim() === "") {
      setProducts([]);
    } else {
      const products = searchProduct(value.trim());
      console.log({ rest: products });
      setProducts(products);
    }
    queue.add(tx.transaction.update.query(tab, value));
  }, DEBOUNCE_DELAY);
  const [error, setError] = useState("");
  useEffect(() => {
    debounced(query);
  }, [query, debounced]);
  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const val = e.currentTarget.value.replace(/\t/g, "").trimStart();
    setQuery(val);
    setError("");
  };

  const handleClickProduct = async (product: Product) => {
    if (ref.current === null) return;
    setProducts([]);
    setQuery("");
    setError("");
    queue.add(tx.transaction.update.query(tab, ""));
    ref.current.focus();
    const id = generateId();
    const storedProducts = productsStore.get().context;
    const found = storedProducts.find(
      (s) => s.barcode === product.barcode && s.barcode.trim() !== "",
    );
    if (found === undefined) {
      const discId = generateId();
      const discounts = [
        {
          eff: 0,
          id: discId,
          kind: "percent" as const,
          subtotal: product.price,
          value: 0,
        },
      ];
      productsStore.trigger.addProduct({
        product: {
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            capital: product.capital,
          },
          barcode: product.barcode ?? "",
          discounts,
          id,
          name: product.name,
          price: product.price,
          qty: 1,
          tab,
          total: product.price,
        },
      });
      queue.add(
        tx.product.add.one({
          id,
          tab,
          price: product.price,
          name: product.name,
          barcode: product.barcode ?? "",
          qty: 1,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            capital: product.capital,
          },
          discounts,
        }),
      );
    } else {
      // inc qty
      productsStore.trigger.incQty({
        id: found.id,
      });
      queue.add(tx.product.update.qty(found.id, found.qty + 1));
      // save reorder
      const currentProducts = productsStore.get().context;
      queue.add(tx.product.update.reorder(currentProducts.map((p) => p.id)));
    }
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
        note: productWithBarcode.note,
      });
      return;
    }
    const product = products.at(0);
    if (product !== undefined) {
      handleClickProduct({
        barcode: product.item.barcode,
        name: product.item.name,
        price: product.item.price,
        id: product.item.id,
        stock: product.item.stock,
        capital: product.item.capital,
        note: product.item.note,
      });
      return;
    }
    setError("Barang tidak ditemukan");
  };
  return {
    query,
    products,
    handleChange: handleChangeInput,
    handleClickProduct,
    handleSubmit,
    error,
    ref,
  };
}
