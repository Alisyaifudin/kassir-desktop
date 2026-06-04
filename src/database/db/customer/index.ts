import { addNewCustomer } from "./add";
import { deleteCustomerById } from "./del-by-id";
import { getAll } from "./get-all";
import { update } from "./update";
import { cache } from "./cache";

export const customer = {
  get: {
    all: getAll,
  },
  update: {
    one: update,
  },
  delete: {
    byId: deleteCustomerById,
  },
  add: {
    one: addNewCustomer,
  },
  // upsert,
  revalidate: cache.revalidate,
};
