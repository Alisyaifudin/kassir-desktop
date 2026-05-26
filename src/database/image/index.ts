import { add } from "./add";
// import { upsert } from "./upsert";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { getByProductId } from "./get-by-product-id";
import { swap } from "./swap";
import { sync } from "./sync";
import { getAllUnsync } from "./get-all-unsync";
import { revalidateCache } from "./cache";

export const image = {
  get: {
    byProductId: getByProductId,
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
    swap,
  },
  // upsert,
  revalidate: revalidateCache,
};
