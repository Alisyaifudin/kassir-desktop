import { add } from "./add";
import { delByTimestamp } from "./del-by-timestamp";
import { getByRange } from "./get-by-range";
import { getLast} from "./get-last";

export const money = {
  get: {
    byRange: getByRange,
    last: getLast,
  },
  delByTimestamp,
  add,
};
