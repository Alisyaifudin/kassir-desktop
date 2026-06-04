import { getAll } from "./get-all";
import { delByItemIds } from "./del-by-item-ids";
import { delByIds } from "./del-by-ids";

export const grave = {
  get: {
    all: getAll,
  },
  del: {
    byItemIds: delByItemIds,
    byIds: delByIds,
  },
};
