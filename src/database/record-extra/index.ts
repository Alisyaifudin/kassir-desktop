import { getByRange } from "./get-by-range";
import { getByRecordId } from "./get-by-record-id";

export const recordExtra = {
  get: {
    byRange: getByRange,
    ByRecordId: getByRecordId,
  },
};
