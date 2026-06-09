import { addNewMethod } from "./add-new";
import { deleteMethodById } from "./del-by-id";
import { deleteManyMethodsSync } from "./del-many-sync";
import { getAllMethods } from "./get-all";
import { getAllUnsync } from "./get-all-unsync";
import { getMethodsUpdatedAt } from "./get-updated-at";
import { updateManyMethodsSyncAt } from "./update-many-sync-at";
import { updateMethod } from "./update";
import { updateUnsyncAllMethods } from "./update-unsync-all";
import { upsertManyMethods } from "./upsert-many-sync";

export const method = {
  get: {
    all: getAllMethods,
    updatedAt: getMethodsUpdatedAt,
    allUnsync: getAllUnsync,
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
