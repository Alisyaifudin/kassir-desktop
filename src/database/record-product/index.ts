import { add } from "./add";
import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";
import { getByTimestampFull } from "./get-by-timestamp-full";
import { updateProductId } from "./update-product-id";

export const recordProduct = {
  get: {
    byRange: getByRange,
    byTimestamp: getByTimestamp,
    byTimestampFull: getByTimestampFull,
  },
  add,
  update: {
    productId: updateProductId,
  },
};
