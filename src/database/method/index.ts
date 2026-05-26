import { add } from "./add";
import { addSync } from "./add-sync";
import { cache } from "./cache";
import { delById } from "./del-by-id";
import { getAll } from "./get-all";
import { getAllUnsync } from "./get-all-unsync";
import { getUpdated } from "./get-updated";
import { sync } from "./sync";
import { update } from "./update";
import { updateSync } from "./update-sync";
import { updateUnsyncAll } from "./update-unsync-all";
// import { upsert } from "./upsert";

export const method = {
  get: {
    all: getAll,
    unsync: getAllUnsync,
    updated: getUpdated,
  },
  del: {
    byId: delById,
  },
  add: {
    one: add,
    sync: addSync,
  },
  update: {
    one: update,
    sync,
    syncFromServer: updateSync,
    unsyncAll: updateUnsyncAll,
  },
  // upsert,
  revalidate: cache.revalidate,
};
