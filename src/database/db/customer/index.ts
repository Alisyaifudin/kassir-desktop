import { addNewCustomer } from "./add-new";
import { deleteCustomerById } from "./del-by-id";
import { deleteManyCustomersSync } from "./del-many-sync";
import { getAllCustomers } from "./get-all";
import { updateCustomer } from "./update";
import { upsertManyCustomersSync } from "./upsert-many-sync";
import { cache } from "./cache";
import { updateUnsyncAllCustomers } from "./update-unsync-all";
import { updateManyCustomersSyncAt } from "./update-many-sync-at";
import { getCustomersUpdatedAt } from "./get-updated-at";
import { getAllUnsyncCustomers } from "./get-all-unsync";

export const customer = {
  get: {
    all: getAllCustomers,
    updatedAt: getCustomersUpdatedAt,
    allUnsync: getAllUnsyncCustomers,
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
  revalidate: cache.revalidate,
};
