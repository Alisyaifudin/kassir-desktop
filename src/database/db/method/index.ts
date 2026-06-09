import { addNewMethod } from "./add-new";
import { cache } from "./cache";
import { deleteMethodById } from "./del-by-id";
import { deleteManyMethodsSync } from "./del-many-sync";
import { getAllMethods } from "./get-all";
import { getAllUnsync } from "./get-all-unsync";
import { getMethodsUpdatedAt } from "./get-updated-at";
import { updateMethodName } from "./update-name";
import { updateManyMethodsSyncAt } from "./update-many-sync-at";
import { updateUnsyncAll } from "./update-unsync-all";
import { upsertManyMethodsSync } from "./upsert-many-sync";

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
    name: updateMethodName,
    unsyncAll: updateUnsyncAll,
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
      many: upsertManyMethodsSync,
    },
  },
  revalidate: cache.revalidate,
};
