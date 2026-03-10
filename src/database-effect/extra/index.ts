import { add } from "./add";
import { delById } from "./del-by-id";
import { all } from "./get-all";
import { getById } from "./get-by-id";
import { update } from "./update";

export const extra = {
  get: {
    all,
    byId: getById,
  },
  delById,
  update,
  add,
};
