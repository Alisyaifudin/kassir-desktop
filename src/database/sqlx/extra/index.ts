import { addNewExtra } from "./add-new";
import { deleteExtraById } from "./del-by-id";
import { deleteManyExtrasSync } from "./del-many-sync";
import { getAllExtra } from "./get-all";
import { getExtraById } from "./get-by-id";
import { updateExtra } from "./update";
import { updateManyExtrasSyncAt } from "./update-many-sync-at";
import { updateSyncOneExtra } from "./update-one-sync";
import { upsertManyExtras } from "./upsert-many-sync";
import { updateUnsyncAllExtras } from "./update-unsync-all";
import { getAllUnsync } from "./get-all-unsync";
import { getExtrasUpdatedAt } from "./get-updated-at";

export const extra = {
  get: {
    all: getAllExtra,
    allUnsync: getAllUnsync,
    updatedAt: getExtrasUpdatedAt,
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
    new: addNewExtra,
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
