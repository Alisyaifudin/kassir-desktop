import { CacheItem } from "~/lib/cache-factory";

export type Method = {
  id: string;
  name?: string;
  kind: DB.MethodEnum;
};

export type MethodFull = Method & {
  deletedAt: number | null;
  updatedAt: number;
  syncAt: number | null;
};

export const cache = new CacheItem<MethodFull>();

// const cache = new Map<string, MethodFull>();

// export function getCache() {
//   return cache;
// }

// export function setCache(extras: MethodFull[]) {
//   cache = extras;
// }

// export function updateCache(cb: (prev: MethodFull[]) => MethodFull[]) {
//   if (cache !== null) {
//     cache = cb(cache);
//   }
// }

// export function revalidateCache() {
//   cache = null;
// }
