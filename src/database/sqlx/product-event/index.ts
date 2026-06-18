import { addNewProductEvent } from "./add-new";
import { getAllUnsyncProductEvent } from "./get-all-unsync";
import { insertManyProductEventSync } from "./insert-many-sync";

export const productEvent = {
  get: {
    allUnsync: getAllUnsyncProductEvent,
  },
  add: {
    new: addNewProductEvent,
  },
  sync: {
    insert: {
      many: insertManyProductEventSync,
    },
  },
};
