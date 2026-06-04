import { getByRange } from "./get-by-range";
import { getByRecordId } from "./get-by-record-id";
import { getByRecordIds } from "./get-by-record-ids";

export const recordExtra = {
  get: {
    byRange: getByRange,
    ByRecordId: getByRecordId,
    byRecordIds: getByRecordIds
  },
};
