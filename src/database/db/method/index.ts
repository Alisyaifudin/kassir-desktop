import { addNewMethod } from "./add-new";
import { cache } from "./cache";
import { deleteMethodById } from "./del-by-id";
import { deleteManyMethodsSync } from "./del-many-sync";
import { getAllMethods } from "./get-all";
import { getUnsyncMethodsAfter } from "./get-unsync-after";
import { updateMethodName } from "./update-name";
import { updateManyMethodsSyncAt } from "./update-many-sync-at";
import { updateUnsyncAll } from "./update-unsync-all";
import { upsertManyMethodsSync as upsertManyMethods } from "./upsert-many-sync";

export const method = {
  get: {
    all: getAllMethods,
    unsync: {
      after: getUnsyncMethodsAfter,
    },
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
      many: upsertManyMethods,
    },
  },
  revalidate: cache.revalidate,
};
