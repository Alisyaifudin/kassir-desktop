import { CacheItem } from "~/lib/cache-factory";

export type Product = {
  id: string;
  price: number;
  barcode?: string;
  name: string;
  stock: number;
  capital: number;
  note: string;
};

export type ProductFull = Product & {
  updatedAt: number;
  syncAt: number | null;
};

export const cache = new CacheItem<ProductFull>();
