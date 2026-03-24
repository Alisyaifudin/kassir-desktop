import { getAll } from "./get-all";
import { updateName } from "./update-name";
import { updateType } from "./update-type";
import { delById } from "./del-by-id";
import { delSync } from "./del-sync";
import { add } from "./add";
import { sync } from "./sync";
import { upsert } from "./upsert";

export const money = {
  get: {
    all: getAll,
  },
  delete: {
    byId: delById,
    sync: delSync,
  },
  add: {
    one: add,
  },
  update: {
    type: updateType,
    name: updateName,
    sync,
  },
  upsert,
};
