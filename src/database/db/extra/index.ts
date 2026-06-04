import { addNewExtra } from "./add";
import { cache } from "./cache";
import { deleteExtraById } from "./del-by-id";
import { deleteManyExtrasSync } from "./del-sync";
import { getAllExtras } from "./get-all";
import { getAllExtrasUnsync } from "./get-all-unsync";
import { getExtraById } from "./get-by-id";
import { updateSyncOneExtra } from "./update-sync-one";
import { updateSyncManyExtras } from "./update-sync-many";
import { update } from "./update";
import { upsert } from "./upsert-one";
import { upsertMany } from "./upsert-many";

export const extra = {
  get: {
    all: getAllExtras,
    unsync: getAllExtrasUnsync,
    byId: getExtraById,
  },
  delete: {
    byId: deleteExtraById,
    sync: deleteManyExtrasSync,
  },
  update: {
    one: update,
    sync: {
      one: updateSyncOneExtra,
      many: updateSyncManyExtras,
    },
  },
  add: {
    one: addNewExtra,
  },
  upsert: {
    one: upsert,
    many: upsertMany,
  },
  revalidate: cache.revalidate,
};
