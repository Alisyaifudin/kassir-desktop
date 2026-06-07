import { addNewExtra } from "./add";
import { deleteExtraById } from "./del-by-id";
import { deleteManyExtrasSync } from "./del-many-sync";
import { getAllExtra } from "./get-all";
import { getExtraById } from "./get-by-id";
import { updateExtra } from "./update";
import { updateManyExtrasSyncAt } from "./update-many-sync-at";
import { updateSyncOneExtra } from "./update-one-sync";
import { upsertManyExtras } from "./upsert-many-sync";
import { getUnsyncExtrasAfter } from "./get-unsync-after";
import { updateUnsyncAllExtras } from "./update-unsync-all";

export const extra = {
  get: {
    all: getAllExtra,
    unsync: {
      after: getUnsyncExtrasAfter,
    },
    byId: getExtraById,
  },
  delete: {
    byId: deleteExtraById,
  },
  update: {
    one: updateExtra,
    unsyncAll: updateUnsyncAllExtras,
  },
  add: {
    one: addNewExtra,
  },
  sync: {
    delete: {
      many: deleteManyExtrasSync,
    },
    update: {
      one: updateSyncOneExtra,
      many: {
        syncAt: updateManyExtrasSyncAt,
      },
    },
    upsert: {
      many: upsertManyExtras,
    },
  },
};
