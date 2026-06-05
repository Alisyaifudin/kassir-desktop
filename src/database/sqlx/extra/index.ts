import { addNewExtra } from "./add";
import { deleteExtraById } from "./del-by-id";
import { deleteManyExtrasSync } from "./del-many-sync";
import { getAllExtra } from "./get-all";
import { getAllUnsyncExtras } from "./get-all-unsync";
import { getExtraById } from "./get-by-id";
import { update } from "./update";
import { updateManyExtrasSync } from "./update-sync-many";
import { updateSyncOneExtra } from "./update-sync-one";
import { upsertManyExtras } from "./upsert-many";
import { upsertOneExtra } from "./update-sync";

export const extra = {
  get: {
    all: getAllExtra,
    unsync: getAllUnsyncExtras,
    byId: getExtraById,
  },
  delete: {
    byId: deleteExtraById,
    sync: {
      many: deleteManyExtrasSync
    },
  },
  update: {
    one: update,
    sync: {
      one: updateSyncOneExtra,
      many: updateManyExtrasSync,
    },
  },
  add: {
    one: addNewExtra,
  },
  upsert: {
    one: upsertOneExtra,
    many: upsertManyExtras,
  },
};
