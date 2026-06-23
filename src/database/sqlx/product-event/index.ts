import { addNewProductEvent } from "./add-new";
import { getAllUnsyncProductEvent } from "./get-all-unsync";
import { getCapitalId } from "./get-capital-id";
import { insertManyProductEventSync } from "./insert-many-sync";

export const productEvent = {
  get: {
    allUnsync: getAllUnsyncProductEvent,
    capitalId: getCapitalId,
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
