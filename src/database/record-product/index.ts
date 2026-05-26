import { getByRecordIds } from "./get-by-by-record-ids";
import { getByRange } from "./get-by-range";
import { getByRecordId } from "./get-by-record-id";
import { getHistory } from "./get-history";
import { updateProductId } from "./update-product-id";

export const recordProduct = {
  get: {
    byRange: getByRange,
    byRecordId: getByRecordId,
    history: getHistory,
    byRecordIds: getByRecordIds,
  },
  update: {
    productId: updateProductId,
  },
};
