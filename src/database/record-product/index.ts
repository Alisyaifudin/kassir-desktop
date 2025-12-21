import { add } from "./add";
import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";
import { updateProductId } from "./update-product-id";

export const recordProduct = {
  get: {
    byRange: getByRange,
    byTimestamp: getByTimestamp,
  },
  add,
  update: {
    productId: updateProductId,
  },
};
