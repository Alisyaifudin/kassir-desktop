import { addNewCustomer } from "./add";
import { deleteCustomerById } from "./del-by-id";
import { getAllCustomers } from "./get-all";
import { updateCustomer } from "./update";

export const customer = {
  get: {
    all: getAllCustomers,
  },
  update: {
    one: updateCustomer,
  },
  delete: {
    byId: deleteCustomerById,
  },
  add: {
    one: addNewCustomer,
  },
};
