import { addNewMethod } from "./add-new";
import { deleteMethodById } from "./del-by-id";
import { deleteManyMethodsSync } from "./del-many-sync";
import { getAllMethods } from "./get-all";
import { getUnsyncMethodAfter } from "./get-unsync-after";
import { updateManyMethodsSyncAt } from "./update-many-sync-at";
import { updateMethod } from "./update";
import { updateUnsyncAllMethods } from "./update-unsync-all";
import { upsertManyMethods } from "./upsert-many-sync";

export const method = {
  get: {
    all: getAllMethods,
    unsync: {
      after: getUnsyncMethodAfter,
    },
  },
  delete: {
    byId: deleteMethodById,
  },
  add: {
    new: addNewMethod,
  },
  update: {
    one: updateMethod,
    unsyncAll: updateUnsyncAllMethods,
  },
  sync: {
    delete: {
      many: deleteManyMethodsSync,
    },
    update: {
      many: {
        syncAt: updateManyMethodsSyncAt,
      },
    },
    upsert: {
      many: upsertManyMethods,
    },
  },
};
