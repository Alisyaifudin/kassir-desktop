import { add } from "./add";
import { addExternal } from "./add-external";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { getAll } from "./get-all";
import { getByRange } from "./get-by-range";
import { getLast } from "./get-last";
import { sync } from "./sync";
// import { upsert } from "./upsert";

export const money = {
  get: {
    all: getAll,
    byRange: getByRange,
    last: getLast,
  },
  delete: {
    byId: delById,
    sync: delSync,
  },
  add: {
    record: add,
    external: addExternal,
  },
  update: { sync },
  // upsert,
};
