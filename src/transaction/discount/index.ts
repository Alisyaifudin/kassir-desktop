import { add } from "./add";
import { delById } from "./del-by-id";
import { kind } from "./update-kind";
import { value } from "./update-value";

export const discount = {
  add,
  update: {
    value,
    kind,
  },
  delById,
};
