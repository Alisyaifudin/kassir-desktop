import { add } from "./add";
import { delById } from "./del-by-id";
import { getByProductId } from "./get-by-product-id";
import { swap } from "./swap";

export const image = {
  get: {
    byProductId: getByProductId,
  },
  add,
  delById,
  swap,
};
