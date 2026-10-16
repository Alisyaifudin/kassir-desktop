import { add } from "./add";
// import { upsert } from "./upsert";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { getByProductId } from "./get-by-product-id";
import { reorder } from "./reorder";
import { sync } from "./sync";
import { getAllUnsync } from "./get-all-unsync";
import { getCache, revalidateCache, subscribe } from "./cache";

export const image = {
  get: {
    byProductId: getByProductId,
    /** already-read rows only; `undefined` until `byProductId` has read them once */
    cachedByProductId: getCache,
    unsync: getAllUnsync,
  },
  add: {
    one: add,
  },
  del: {
    byId: delById,
    sync: delSync,
  },
  update: {
    sync,
    reorder,
  },
  // upsert,
  revalidate: revalidateCache,
  /** image rows changed: for readers that keep a derived value (see `cache.ts`) */
  subscribe,
};
