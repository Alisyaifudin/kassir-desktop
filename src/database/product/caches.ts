export type Product = {
  id: number;
  price: number;
  barcode?: string;
  name: string;
  stock: number;
};

let cache: Product[] | null = null;

export function getCache() {
  return cache;
}

export function setCache(updated: (Product[] | null) | ((cache: Product[]) => Product[])) {
  if (typeof updated === "function") {
    if (cache === null) return;
    cache = updated(cache);
    return;
  }
  cache = updated;
}
