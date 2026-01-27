import { add } from "./add";
import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";

export const recordExtra = {
  get: {
    byRange: getByRange,
    // byTimestamp: getByTimestamp,
  },
  // add,
};
