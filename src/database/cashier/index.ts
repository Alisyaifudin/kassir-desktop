import { add } from "./add";
import { all } from "./get-all";
import { byName } from "./get-by-name";
import { updateHash } from "./update-hash";
import { updateName } from "./update-name";

export const cashier = {
  get: {
    all,
    byName,
  },
  add,
  update: {
    name: updateName,
    hash: updateHash,
  },
};
