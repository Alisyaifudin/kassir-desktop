import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";
import { getHistory } from "./get-history";
import { updateProductId } from "./update-product-id";

export const recordProduct = {
  get: {
    byRange: getByRange,
    byTimestamp: getByTimestamp,
    history: getHistory,
  },
  update: {
    productId: updateProductId,
  },
};
