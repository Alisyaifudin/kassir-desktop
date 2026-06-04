import { add } from "./add";
import { cache } from "./cache";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { getAll } from "./get-all";
import { getAllUnsync } from "./get-all-unsync";
import { sync } from "./sync";
import { update } from "./update";
// import { upsert } from "./upsert";

export const social = {
  get: {
    all: getAll,
    unsync: getAllUnsync,
  },
  update: {
    one: update,
    sync,
  },
  del: {
    byId: delById,
    sync: delSync,
  },
  add,
  // upsert,
  revalidate: cache.revalidate,
};
