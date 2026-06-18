import { addNewCapital } from "./add-new";
import { deleteCapitalById } from "./del-by-id";
import { deleteManyCapitalsSync } from "./del-many-sync";
import { getAllUnsyncCapitals } from "./get-all-unsync";
import { getCapitalsUpdatedAt } from "./get-updated-at";
import { updateCapital } from "./update";
import { updateManyCapitalsSyncAt } from "./update-many-sync-at";
import { updateUnsyncAllCapitals } from "./update-unsync-all";
import { upsertManyCapitalsSync } from "./upsert-many-sync";

export const capital = {
  get: {
    updatedAt: getCapitalsUpdatedAt,
    allUnsync: getAllUnsyncCapitals,
  },
  delete: {
    byId: deleteCapitalById,
  },
  add: {
    new: addNewCapital,
  },
  update: {
    one: updateCapital,
    unsyncAll: updateUnsyncAllCapitals,
  },
  sync: {
    delete: {
      many: deleteManyCapitalsSync,
    },
    update: {
      many: {
        syncAt: updateManyCapitalsSyncAt,
      },
    },
    upsert: {
      many: upsertManyCapitalsSync,
    },
  },
};
