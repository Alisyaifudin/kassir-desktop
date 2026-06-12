import { getAllPocket } from "./get-all";
import { getPocketById } from "./get-by-id";
import { getMaxPocketOrdering } from "./get-max-ordering";
import { getAllUnsyncPocket } from "./get-all-unsync";
import { updatePocketName } from "./update-name";
import { updatePocketReorder } from "./update-reorder";
import { updatePocketType } from "./update-type";
import { updateManyPocketSyncAt } from "./update-many-sync-at";
import { deletePocketById } from "./del-by-id";
import { deleteManyPocketSync } from "./del-many-sync";
import { addNewPocket } from "./add-new";
import { upsertOnePocketSync } from "./upsert-one-sync";

export const pocket = {
  get: {
    all: getAllPocket,
    byId: getPocketById,
    maxOrdering: getMaxPocketOrdering,
    allUnsync: getAllUnsyncPocket,
  },
  delete: {
    byId: deletePocketById,
  },
  add: {
    new: addNewPocket,
  },
  update: {
    type: updatePocketType,
    name: updatePocketName,
    reorder: updatePocketReorder,
    sync: {},
  },
  sync: {
    delete: {
      many: deleteManyPocketSync,
    },
    update: {
      many: {
        syncAt: updateManyPocketSyncAt,
      },
    },
    upsert: {
      one: upsertOnePocketSync,
    },
  },
};
