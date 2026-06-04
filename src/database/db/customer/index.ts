import { addNewCustomer } from "./add";
import { delById } from "./del-by-id";
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
  del: {
    byId: delById,
  },
  add: {
    one: addNewCustomer,
  },
  // upsert,
  revalidate: cache.revalidate,
};
