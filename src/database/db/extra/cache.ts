import { CacheItem } from "~/lib/cache-factory";

export type Extra = {
  id: string;
  name: string;
  value: number;
  kind: DB.ValueKind;
};

export type ExtraFull = {
  id: string;
  name: string;
  value: number;
  kind: DB.ValueKind;
  updatedAt: number;
  syncAt?: number;
};

export const cache = new CacheItem<ExtraFull>();
