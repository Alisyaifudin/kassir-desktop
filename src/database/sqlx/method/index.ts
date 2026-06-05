import { addNewMethod } from "./add";
import { deleteMethodById } from "./del-by-id";
import { getAllMethods } from "./get-all";
import { getAllUnsyncMethods } from "./get-all-unsync";
import { updateMethodName } from "./update-name";
import { updateSyncManyMethods } from "./update-sync-many";
import { updateUnsyncAll } from "./update-unsync-all";
import { upsertManyMethods } from "./upsert-many";

export const method = {
  get: {
    all: getAllMethods,
    unsync: getAllUnsyncMethods,
  },
  delete: {
    byId: deleteMethodById,
  },
  add: {
    one: addNewMethod,
  },
  update: {
    sync: {
      many: updateSyncManyMethods,
    },
    one: updateMethodName,
    unsync: updateUnsyncAll,
  },
  upsert: {
    many: upsertManyMethods,
  },
};
