import { add } from "./add";
import { all } from "./get-all";
import { byName } from "./get-by-name";

export const cashier = {
  get: {
    all,
    byName,
  },
  add,
};
