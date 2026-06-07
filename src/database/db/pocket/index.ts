import { addNewPocket } from "./add-new";
import { deletePocketById } from "./del-by-id";
import { deleteManyPocketSync } from "./del-many-sync";
import { getAllPocket } from "./get-all";
import { getPocketById } from "./get-by-id";
import { getMaxPocketOrdering } from "./get-max-ordering";
import { getUnsyncPocketAfter } from "./get-unsync-after";
import { updatePocketName } from "./update-name";
import { updatePocketReorder } from "./update-reorder";
import { updatePocketType } from "./update-type";
import { updateManyPocketSyncAt } from "./update-many-sync-at";
// import { upsertOnePocket } from "./upsert";

export const moneyKind = {
  get: {
    all: getAllPocket,
    maxOrdering: getMaxPocketOrdering,
    byId: getPocketById,
    unsync: {
      after: getUnsyncPocketAfter,
    },
  },
  delete: {
    byId: deletePocketById,
    sync: {
      many: deleteManyPocketSync,
    },
  },
  add: {
    one: addNewPocket,
  },
  update: {
    type: updatePocketType,
    name: updatePocketName,
    reorder: updatePocketReorder,
    sync: {
      many: updateManyPocketSyncAt,
    },
  },
  // upsert: {
  //   one: upsertOnePocket,
  // },
};
