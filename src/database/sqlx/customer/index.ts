import { addNewCustomer } from "./add";
import { deleteCustomerById } from "./del-by-id";
import { getAllCustomers } from "./get-all";
// import { getAllCustomersUnsync } from "./get-all-unsync"; // TODO
// import { updateSyncCustomer } from "./update-sync-customer"; // TODO
import { updateCustomer } from "./update";

export const customer = {
  get: {
    all: getAllCustomers,
    // unsync: getAllCustomersUnsync,
  },
  update: {
    one: updateCustomer,
    // sync: updateSyncCustomer,
  },
  delete: {
    byId: deleteCustomerById,
  },
  add: {
    one: addNewCustomer,
  },
};
