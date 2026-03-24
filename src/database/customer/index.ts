import { add } from "./add";
import { upsert } from "./upsert";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { getAll } from "./get-all";
import { getAllUnsync } from "./get-all-unsync";
import { sync } from "./sync";
import { update } from "./update";

export const customer = {
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
  add: {
    one: add,
  },
  upsert,
};
