import { CacheItem } from "~/lib/cache-factory";

export type Method = {
  id: string;
  name?: string;
  label?: string;
  kind: DB.MethodEnum;
};

export type MethodFull = Method & {
  updatedAt: number;
  syncAt?: number;
};

export const cache = new CacheItem<MethodFull>();
