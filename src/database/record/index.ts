import { delByTimestamp } from "./del-by-timestamp";
import { getByRange } from "./get-by-range";
import { getByTimestamp } from "./get-by-timestamp";
import { updateMethod } from "./update-method";
import { updateMode } from "./update-mode";
import { updateNote } from "./update-note";
import { updatePayCredit } from "./update-pay-credit";
import { updateTimestamp } from "./update-timestamp";
import { updateToCredit } from "./update-to-credit";

export const record = {
  get: {
    byRange: getByRange,
    byTimestamp: getByTimestamp,
  },
  delByTimestamp,
  update: {
    toCredit: updateToCredit,
    payCredit: updatePayCredit,
    note: updateNote,
    timestamp: updateTimestamp,
    mode: updateMode,
    method: updateMethod,
  },
};
