import { add } from "./add";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { all } from "./get-all";
import { allUnsync } from "./get-all-unsync";
import { getById } from "./get-by-id";
import { sync } from "./sync";
import { update } from "./update";
import { upsert } from "./upsert";

export const extra = {
  get: {
    all,
    unsync: allUnsync,
    byId: getById,
  },
  del: {
    byId: delById,
    sync: delSync,
  },
  update: {
    one: update,
    sync,
  },
  add: {
    one: add,
  },
  upsert
};
