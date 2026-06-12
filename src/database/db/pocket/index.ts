import { addNewPocket } from "./add-new";
import { deletePocketById } from "./del-by-id";
import { deleteManyPocketSync } from "./del-many-sync";
import { getAllPocket } from "./get-all";
import { getPocketById } from "./get-by-id";
import { getAllUnsyncPocket } from "./get-all-unsync";
import { updatePocketName } from "./update-name";
import { updatePocketReorder } from "./update-reorder";
import { updatePocketType } from "./update-type";
import { updateManyPocketSyncAt } from "./update-many-sync-at";
import { getMaxPocketOrdering } from "./get-max-ordering";
import { upsertOnePocketSync } from "~/database/sqlx/pocket/upsert-one-sync";
// import { upsertOnePocket } from "./upsert";

export const pocket = {
  get: {
    all: getAllPocket,
    maxOrdering: getMaxPocketOrdering,
    byId: getPocketById,
    allUnsync: getAllUnsyncPocket,
  },
  delete: {
    byId: deletePocketById,
  },
  add: {
    one: addNewPocket,
  },
  update: {
    type: updatePocketType,
    name: updatePocketName,
    reorder: updatePocketReorder,
  },
  sync: {
    update: {
      many: {
        updatedAt: updateManyPocketSyncAt,
      },
    },
    delete: {
      many: deleteManyPocketSync,
    },
    upsert: {
      one: upsertOnePocketSync,
    },
  },
};
