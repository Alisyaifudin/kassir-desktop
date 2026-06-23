import { CacheItem } from "~/lib/cache-factory";

type Capital = {
  id: string;
  stock: number;
  capital: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  note: string;
  capitals: Capital[];
  codes: string[];
};

type ProductEvent = {
  id: string;
  timestamp: number;
  value: number;
};

export type ProductFull = Product & {
  events: ProductEvent[];
};

export const cache = new CacheItem<Product>();
