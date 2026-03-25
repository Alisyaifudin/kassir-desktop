import { add } from "./add";
import { cache } from "./cache";
import { delById } from "./del-by-id";
import { getAll } from "./get-all";
import { getAllUnsync } from "./get-all-unsync";
import { sync } from "./sync";
import { update } from "./update";
import { upsert } from "./upsert";

export const method = {
  get: {
    all: getAll,
    unsync: getAllUnsync,
  },
  del: {
    byId: delById,
  },
  add: {
    one: add,
  },
  update: {
    one: update,
    sync,
  },
  upsert,
  revalidate: cache.revalidate,
};
