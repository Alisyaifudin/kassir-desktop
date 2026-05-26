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
  syncAt: number | null;
};

export const cache = new CacheItem<ExtraFull>();

// let cache: ExtraFull[] | null = null;

// export function getCache() {
//   return cache;
// }

// export function setCache(extras: ExtraFull[]) {
//   cache = extras;
// }

// export function updateCache(cb: (prev: ExtraFull[]) => ExtraFull[]) {
//   if (cache !== null) {
//     cache = cb(cache);
//   }
// }

// export function revalidateCache() {
//   cache = null;
// }
