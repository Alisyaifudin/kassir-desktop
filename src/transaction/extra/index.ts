import { add } from "./add";
import { delById } from "./del-by-id";
import { getByTab } from "./get-by-tab";
import { kind } from "./update-kind";
import { name } from "./update-name";
import { value } from "./update-value";

export const extra = {
  add: {
    one: add,
  },
  getByTab,
  delById,
  update: {
    name,
    value,
    kind,
  },
};
