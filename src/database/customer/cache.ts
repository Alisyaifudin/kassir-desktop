import { CacheItem } from "~/lib/cache-factory";

export type Customer = {
  phone: string;
  name: string;
  id: string;
};

export type CustomerFull = {
  phone: string;
  name: string;
  id: string;
  updatedAt: number;
  syncAt: null | number;
};

export const cache = new CacheItem<CustomerFull>();
