import { addNewRecord } from "./add-new";
import { deleteRecordById } from "./del-by-id";
import { deleteManyRecordsSync } from "./del-many-sync";
import { getAllUnsyncRecords } from "./get-all-unsync";
import { getRecordById } from "./get-by-id";
import { getRangeRecord } from "./get-range";
import { getRecordsUpdatedAt } from "./get-updated-at";
import { updateManyRecordsSyncAt } from "./update-many-sync-at";
import { upsertRecordSync } from "./upsert-sync";

export const record = {
  get: {
    allUnsync: getAllUnsyncRecords,
    byId: getRecordById,
    byRange: getRangeRecord,
    updatedAt: getRecordsUpdatedAt,
  },
  update: {},
  delete: {
    byId: deleteRecordById,
  },
  add: {
    new: addNewRecord,
  },
  sync: {
    delete: {
      many: deleteManyRecordsSync,
    },
    update: {
      many: {
        syncAt: updateManyRecordsSyncAt,
      },
    },
    upsert: {
      one: upsertRecordSync,
    },
  },
};
