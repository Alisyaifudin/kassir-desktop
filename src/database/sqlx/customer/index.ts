import { addNewCustomer } from "./add-new";
import { deleteCustomerById } from "./del-by-id";
import { deleteManyCustomersSync } from "./del-many-sync";
import { getUnsyncCustomersAfter } from "./get-unsync-after";
import { getAllCustomers } from "./get-all";
import { updateCustomer } from "./update";
import { updateManyCustomersSyncAt } from "./update-many-sync-at";
import { updateUnsyncAllCustomers } from "./update-unsync-all";
import { upsertManyCustomersSync } from "./upsert-many-sync";
import { getCustomersUpdatedAt } from "./get-updated-at";
import { getCustomerLastSyncAt } from "./get-last-sync-at";

export const customer = {
  get: {
    all: getAllCustomers,
    updatedAt: getCustomersUpdatedAt,
    lastSycnAt: getCustomerLastSyncAt,
    unsync: {
      after: getUnsyncCustomersAfter,
    },
  },
  update: {
    one: updateCustomer,
    unsyncAll: updateUnsyncAllCustomers,
  },
  delete: {
    byId: deleteCustomerById,
  },
  add: {
    new: addNewCustomer,
  },
  sync: {
    delete: {
      many: deleteManyCustomersSync,
    },
    update: {
      many: {
        syncAt: updateManyCustomersSyncAt,
      },
    },
    upsert: {
      many: upsertManyCustomersSync,
    },
  },
};
