import { addNewMoney } from "./add-new";
import { addManyMoneyExternal } from "./add-many-external";
import { deleteMoneyById } from "./del-by-id";
import { getMoneyByRange } from "./get-by-range";
import { getLastMoney } from "./get-last";
import { getAllUnsyncMoney } from "./get-all-unsync";
import { updateMoneyNote } from "./update-note";
import { deleteManyMoneySync } from "./del-many-sync";
import { updateManyMoneySyncAt } from "./update-many-sync-at";
import { upsertManyMoney } from "./upsert-many-sync";
import { updateUnsyncAllMoney } from "./update-unsync-all";
import { getAllMoney } from "./get-all";
import { getCurrentMoney } from "./get-current";
import { getMoneyUpdatedAt } from "./get-updated-at";

export const money = {
  get: {
    all: getAllMoney,
    byRange: getMoneyByRange,
    updatedAt: getMoneyUpdatedAt,
    last: getLastMoney,
    current: getCurrentMoney,
    allUnsync: getAllUnsyncMoney,
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
      many: upsertManyMoney,
    },
  },
};
