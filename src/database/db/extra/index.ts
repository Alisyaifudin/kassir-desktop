import { addNewExtra } from "./add-new";
import { cache } from "./cache";
import { deleteExtraById } from "./del-by-id";
import { deleteManyExtrasSync } from "./del-many-sync";
import { getAllExtras } from "./get-all";
import { getExtraById } from "./get-by-id";
import { getAllExtrasUnsync } from "./get-all-unsync";
import { updateOneExtraSync } from "./update-one-sync";
import { updateManyExtrasSyncAt } from "./update-many-sync-at";
import { updateExtra } from "./update";
import { updateUnsyncAllExtras } from "./update-unsync-all";
import { upsertManyExtrasSync } from "./upsert-many-sync";

export const extra = {
  get: {
    all: getAllExtras,
    allUnsync: getAllExtrasUnsync,
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
      one: updateOneExtraSync,
      many: {
        syncAt: updateManyExtrasSyncAt,
      },
    },
    upsert: {
      many: upsertManyExtrasSync,
    },
  },
  revalidate: cache.revalidate,
};
