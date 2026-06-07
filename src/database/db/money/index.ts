import { addNewMoney } from "./add-new";
import { addManyMoneyExternal } from "./add-many-external";
import { deleteMoneyById } from "./del-by-id";
import { deleteManyMoneySync } from "./del-many-sync";
import { getAllMoney } from "./get-all";
import { getUnsyncMoneyAfter } from "./get-unsync-after";
import { updateMoneyNote } from "./update-note";
import { updateManyMoneySyncAt } from "./update-many-sync-at";
import { updateUnsyncAllMoney } from "./update-unsync-all";
import { upsertManyMoneySync } from "./upsert-many-sync";

export const money = {
  get: {
    all: getAllMoney,
    unsync: {
      after: getUnsyncMoneyAfter,
    },
  },
  delete: {
    byId: deleteMoneyById,
  },
  add: {
    new: addNewMoney,
    external: addManyMoneyExternal,
  },
  update: {
    note: updateMoneyNote,
    unsyncAll: updateUnsyncAllMoney,
  },
  sync: {
    delete: {
      many: deleteManyMoneySync,
    },
    update: {
      many: {
        syncAt: updateManyMoneySyncAt,
      },
    },
    upsert: {
      many: upsertManyMoneySync,
    },
  },
};
