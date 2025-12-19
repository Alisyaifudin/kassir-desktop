import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";
import { updateProductId } from "./update-product-id";

export const recordProduct = {
  get: {
    byRange: getByRange,
    byTimestamp: getByTimestamp,
  },
  update: {
    productId: updateProductId,
  },
};
