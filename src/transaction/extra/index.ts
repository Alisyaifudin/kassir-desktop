import { add } from "./add";
import { delById } from "./del-by-id";
import { getByTab } from "./get-by-tab";
import { kind } from "./update-kind";
import { name } from "./update-name";
import { saved } from "./update-saved";
import { value } from "./update-value";

export const extra = {
  add,
  getByTab,
  delById,
  update: {
    name,
    value,
    kind,
    saved,
  },
};
