import { CacheItem } from "~/lib/cache-factory";

export type Product = {
  id: string;
  price: number;
  barcode?: string;
  name: string;
  stock: number;
  capital: number;
};

export type ProductFull = Product & {
  note: string;
  updatedAt: number;
  syncAt: number | null;
};

export const cache = new CacheItem<ProductFull>();
