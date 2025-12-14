import fuzzysort from "fuzzysort";
import { Product } from "~/database/product/caches";

export const useProductSearch = () => {
  const search = (query: string, products: Product[]) => {
    const productFromName = fuzzysort.go(query, products, { key: "name" }).map((q) => q.obj);
    const productFromBarcode = fuzzysort.go(query, products, { key: "barcode" }).map((q) => q.obj);
    const filtered = new Set([...productFromBarcode, ...productFromName]);
    return Array.from(filtered);
  };

  return search;
};
